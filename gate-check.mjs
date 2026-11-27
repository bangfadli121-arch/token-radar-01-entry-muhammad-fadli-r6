// RADAR-6 gate check — 7 checks, run from the entry root:
//   node gate-check.mjs <output-dir> [snapshot.json]
// Exits 0 only when all 7 pass.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2] ?? 'out-a';
const snapshot = process.argv[3] ?? '/home/hatch/workspace/makefun/token-radar-01-kit-new/token-radar-01-kit/input/snapshot.json';
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

// 1. dashboard files: exactly the 3 sources, total under the 65,536-byte text cap.
const dash = join(out, 'dashboard');
const dashFiles = existsSync(dash) ? readdirSync(dash).filter((f) => !f.startsWith('.')).sort() : [];
const dashBytes = dashFiles.reduce((s, f) => s + statSync(join(dash, f)).size, 0);
check('dashboard_files', JSON.stringify(dashFiles) === JSON.stringify(['app.css', 'app.js', 'index.html']) && dashBytes <= 65536, `${dashFiles.join(', ')} = ${dashBytes} bytes`);

// 2. board file: 178 rows.
const boardPath = join(out, 'board.json');
let board = null;
try { board = JSON.parse(readFileSync(boardPath, 'utf8')).rows; } catch { /* handled below */ }
check('board_file', Array.isArray(board) && board.length === 178, board ? `${board.length} rows` : 'board.json unreadable');

// 3. sorted by implied value, descending.
const sorted = Array.isArray(board) && board.every((r, i) => i === 0 || board[i - 1].implied_value_usd >= r.implied_value_usd);
check('sorted_by_value', sorted, board ? `rank 1 ${board[0]?.implied_value_usd} down to rank ${board.length} ${board[board.length - 1]?.implied_value_usd}` : 'no board');

// 4. watchlist coverage: all 40 slugs on the board.
let snap = null;
try { snap = JSON.parse(readFileSync(snapshot, 'utf8')); } catch { /* handled below */ }
const onBoard = new Set((board ?? []).map((r) => r.slug));
const missing = snap ? snap.watchlist.filter((s) => !onBoard.has(s)) : ['snapshot unreadable'];
check('coverage', snap !== null && missing.length === 0, snap ? `${snap.watchlist.length - missing.length}/${snap.watchlist.length} watchlist slugs` : 'snapshot unreadable');

// 5. farm steps: 3–12 steps per row, each 20–600 characters.
let badSteps = 0;
for (const r of board ?? []) {
  if (!Array.isArray(r.farm_steps) || r.farm_steps.length < 3 || r.farm_steps.length > 12) { badSteps++; continue; }
  if (r.farm_steps.some((s) => typeof s !== 'string' || s.length < 20 || s.length > 600)) badSteps++;
}
check('farm_steps', badSteps === 0, `${(board ?? []).length} rows checked, ${badSteps} bad`);

// 6. screenshots: exactly 3, each 1440×900 PNG, each at most 512 KiB.
const shots = join(out, 'screenshots');
const shotFiles = existsSync(shots) ? readdirSync(shots).filter((f) => !f.startsWith('.')).sort() : [];
let shotsOk = shotFiles.length === 3;
const shotInfo = [];
for (const f of shotFiles) {
  const buf = readFileSync(join(shots, f));
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const ok = isPng && w === 1440 && h === 900 && buf.length <= 524288;
  if (!ok) shotsOk = false;
  shotInfo.push(`${f} ${w}x${h} ${buf.length} bytes`);
}
check('screenshots', shotsOk, shotInfo.join('; '));

// 7. dossier: a fresh rebuild matches byte-for-byte, and stays under 1.5 MB.
let dossierOk = false, dossierDetail = '';
try {
  const tmp = mkdtempSync(join(tmpdir(), 'r6-gate-'));
  execFileSync('node', ['main.ts', '--input', snapshot, '--output', join(tmp, 'out')], { stdio: 'pipe' });
  const a = readFileSync(join(out, 'dossier.json'));
  const b = readFileSync(join(tmp, 'out', 'dossier.json'));
  dossierOk = a.equals(b) && a.length <= 1572864;
  dossierDetail = `${a.length} bytes, byte-identical to a fresh rebuild: ${a.equals(b)}`;
  rmSync(tmp, { recursive: true, force: true });
} catch (e) { dossierDetail = `rebuild failed: ${String(e).slice(0, 120)}`; }
check('dossier_matches', dossierOk, dossierDetail);

const passed = checks.filter((c) => c.ok).length;
console.log(`\n${passed}/${checks.length} checks passed`);
process.exit(passed === checks.length ? 0 : 1);
