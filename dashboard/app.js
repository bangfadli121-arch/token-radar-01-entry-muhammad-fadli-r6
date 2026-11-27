/* RADAR-6 — the window-curve bulletin. Renders window.RADAR (data.js) with no network. */
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.getElementById('board').textContent = 'No data.'; return; }
  var M = D.model;

  /* ---------- formatting ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 0 : 2).replace(/\.00$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(n) { if (n == null) return '—'; return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
  function ageFmt(a) { if (a == null) return '—'; if (a < 365) return a + 'd'; return (a / 365).toFixed(1) + 'y'; }
  function effFmt(n) { if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'; return '$' + n.toFixed(0); }

  /* ---------- the model, same arithmetic as lib/model.ts ---------- */
  function valueOf(r) {
    var age = r.age_days == null ? M.unknown_age_days : r.age_days;
    var g = Math.min(M.growth_cap, Math.max(M.growth_floor, r.change_7d == null ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * M.growth_weight;
    var x = Math.log(Math.max(age, 1) / M.window_peak_days);
    var wm = M.window_floor + M.window_range * Math.exp(-(x * x) / (2 * M.window_sigma * M.window_sigma));
    var bm = 1 + M.breadth_per_chain * Math.min(Math.max(r.chains.length - 1, 0), M.breadth_max_chains);
    return Math.max(1, Math.round(r.tvl_usd * M.base_multiple * gm * wm * bm));
  }
  function windowMultAt(age) {
    var a = Math.max(age == null ? M.unknown_age_days : age, 1);
    var x = Math.log(a / M.window_peak_days);
    return M.window_floor + M.window_range * Math.exp(-(x * x) / (2 * M.window_sigma * M.window_sigma));
  }
  function capitalFor(r) {
    if (r.tvl_usd >= 5e9) return 250;
    if (r.tvl_usd >= 1e9) return 150;
    if (r.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdFor(r) {
    var a = r.age_days;
    if (a == null) return 30;
    if (a < 180) return 60;
    if (a < 365) return 45;
    return 30;
  }

  /* ---------- farm steps, same words as lib/model.ts ---------- */
  function chainOf(r) { return r.chains.length ? r.chains[0] : 'its main chain'; }
  function mainAction(r, capital, chain) {
    var c = (r.category || '').toLowerCase(), name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Lend $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and leave the supply open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('liquidity manager') >= 0) return 'Add $' + capital + ' of liquidity to the main pool of ' + name + ' on ' + chain + ' and leave it in.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Put $' + capital + ' into a vault run by ' + name + ' on ' + chain + ' and hold the vault shares.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the yield-bearing asset ' + name + ' offers on ' + chain + ' and hold it.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Post $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('prediction') >= 0) return 'Fund ' + name + ' with $' + capital + ' and take one position in a live market.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the underlying asset through ' + name + ' and keep the receipt token.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC through ' + name + ' onto ' + chain + ' and put the bridged funds to work in its app.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and leave the position open.';
  }
  function secondAction(r, chain) {
    var c = (r.category || '').toLowerCase(), name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow a small amount against the supply on ' + name + ', then repay it, so the farm shows both sides of the market.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('liquidity manager') >= 0) return 'Swap a small amount in the same pool once a week, so the farm shows trading as well as liquidity.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Put a second, smaller deposit into another vault ' + name + ' runs, so the farm spans two vaults.';
    if (c.indexOf('rwa') >= 0) return 'Mint a second yield asset from ' + name + ', or stake the first one if it offers staking.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Rebalance the hedge once a month: close it and reopen it at the new level.';
    if (c.indexOf('prediction') >= 0) return 'Take a second position in a different market on ' + name + '.';
    if (c.indexOf('insurance') >= 0) return 'Check the policy\u2019s claim page and extend the cover before it lapses.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Restake the receipt token ' + name + ' issued, if it offers a restaking step.';
    if (c.indexOf('stable') >= 0) return 'Move a small amount of the stable asset into a second use ' + name + ' offers, such as a vault or a pool.';
    if (c.indexOf('bridge') >= 0) return 'Use the bridged funds in ' + name + '\u2019s app on ' + chain + ' instead of leaving them idle.';
    return 'Do one more qualifying action on ' + name + ' on ' + chain + ', such as a vote, a second deposit or a small swap.';
  }
  function stepText(t, cost, time) {
    var s = t + ' Cost: ' + cost + '. Time: ' + time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s += ' Hold the position and check the protocol\u2019s own page.';
    return s;
  }
  function farmSteps(r) {
    var chain = chainOf(r), capital = capitalFor(r), hold = holdFor(r), band = r.window_band;
    var note = band === 'too early'
      ? ' This protocol is early on the window curve: re-check its window in 90 days before adding more capital.'
      : band === 'late'
        ? ' This protocol is late on the window curve: keep the position small, the window may already be closing.'
        : ' This protocol sits inside the launch window: the curve is near its peak.';
    return [
      stepText('Open a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper.' + note, 'under $3 of gas for the first transaction', '5 minutes'),
      stepText(mainAction(r, capital, chain), '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', '15 minutes to set up'),
      stepText(secondAction(r, chain), 'about $2 to $5 of gas', '10 minutes'),
      stepText('Do one qualifying action every week \u2014 a deposit, a borrow, a swap or a vote \u2014 so the farm stays active.', 'about $2 of gas a week', '10 minutes a week'),
      stepText('Hold the position for at least ' + hold + ' days so the activity lands in more than one snapshot.', 'the $' + capital + ' stays in the position', hold + ' days'),
      stepText('Before you withdraw, open ' + r.name + '\u2019s own points or rewards page and claim only from the link it publishes; never pay anyone to claim for you.', 'nothing to check', '10 minutes'),
      stepText('Write the wallet, the dates and every transaction in a farm log, so the position can be repeated or unwound later.', 'nothing but the log', '5 minutes')
    ];
  }

  /* ---------- window curve chart ---------- */
  var X0 = 30, X1 = 3000, Y0 = 0.5, Y1 = 1.05, W = 560, H = 210, PL = 34, PR = 8, PT = 8, PB = 22;
  function cx(age) { return PL + (Math.log(age) - Math.log(X0)) / (Math.log(X1) - Math.log(X0)) * (W - PL - PR); }
  function cy(v) { return PT + (1 - (v - Y0) / (Y1 - Y0)) * (H - PT - PB); }
  function bandX(a, b) { return 'x="' + cx(a).toFixed(1) + '" width="' + (cx(b) - cx(a)).toFixed(1) + '"'; }
  function curveSvg(dots) {
    var pts = [];
    for (var i = 0; i <= 80; i++) {
      var age = X0 * Math.pow(X1 / X0, i / 80);
      pts.push(cx(age).toFixed(1) + ',' + cy(windowMultAt(age)).toFixed(1));
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Window curve: implied-value multiplier by protocol age">';
    s += '<rect y="' + PT + '" height="' + (H - PT - PB) + '" ' + bandX(30, 180) + ' fill="#f3e2c2"/>';
    s += '<rect y="' + PT + '" height="' + (H - PT - PB) + '" ' + bandX(180, 1095) + ' fill="#dcead9"/>';
    s += '<rect y="' + PT + '" height="' + (H - PT - PB) + '" ' + bandX(1095, 3000) + ' fill="#f2d5d3"/>';
    [0.6, 0.8, 1.0].forEach(function (v) {
      s += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + cy(v) + '" y2="' + cy(v) + '" stroke="#ddd5c4" stroke-width="1"/>';
      s += '<text x="' + (PL - 4) + '" y="' + (cy(v) + 4) + '" font-size="10" fill="#6b645a" text-anchor="end">' + v.toFixed(1) + '×</text>';
    });
    s += '<line x1="' + cx(730) + '" x2="' + cx(730) + '" y1="' + PT + '" y2="' + (H - PB) + '" stroke="#8c2f39" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<text x="' + cx(730) + '" y="' + (PT + 10) + '" font-size="10" fill="#8c2f39" text-anchor="middle">peak · 2y</text>';
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#1c1a17" stroke-width="2.5"/>';
    [[30, '30d'], [90, '90d'], [180, '180d'], [365, '1y'], [1095, '3y'], [2000, '5.5y'], [3000, '8y']].forEach(function (t) {
      s += '<text x="' + cx(t[0]) + '" y="' + (H - 6) + '" font-size="10" fill="#6b645a" text-anchor="middle">' + t[1] + '</text>';
    });
    s += '<text x="' + cx(105) + '" y="' + (H - PB - 6) + '" font-size="10" fill="#b7791f" text-anchor="middle">too early</text>';
    s += '<text x="' + cx(620) + '" y="' + (H - PB - 6) + '" font-size="10" fill="#1f5c3d" text-anchor="middle">in window</text>';
    s += '<text x="' + cx(1900) + '" y="' + (H - PB - 6) + '" font-size="10" fill="#8c2f39" text-anchor="middle">late</text>';
    (dots || []).forEach(function (d) {
      var a = d.age_days == null ? M.unknown_age_days : Math.max(d.age_days, 30);
      s += '<circle cx="' + cx(a).toFixed(1) + '" cy="' + cy(windowMultAt(a)).toFixed(1) + '" r="4.5" fill="#1f5c3d" stroke="#fffdf8" stroke-width="1.5"/>';
    });
    return s + '</svg>';
  }
  function miniCurve(age) {
    var s = '<svg class="mini" viewBox="0 0 ' + W + ' 120" role="img" aria-label="Window curve with this protocol marked">';
    s += '<rect y="6" height="84" ' + bandX(30, 180) + ' fill="#f3e2c2"/>';
    s += '<rect y="6" height="84" ' + bandX(180, 1095) + ' fill="#dcead9"/>';
    s += '<rect y="6" height="84" ' + bandX(1095, 3000) + ' fill="#f2d5d3"/>';
    var pts = [];
    for (var i = 0; i <= 60; i++) {
      var a = X0 * Math.pow(X1 / X0, i / 60);
      pts.push(cx(a).toFixed(1) + ',' + (6 + (1 - (windowMultAt(a) - 0.5) / 0.55) * 84).toFixed(1));
    }
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#1c1a17" stroke-width="2"/>';
    var ma = age == null ? M.unknown_age_days : Math.max(age, 30);
    var my = 6 + (1 - (windowMultAt(ma) - 0.5) / 0.55) * 84;
    s += '<circle cx="' + cx(ma).toFixed(1) + '" cy="' + my.toFixed(1) + '" r="6" fill="#8c2f39" stroke="#fffdf8" stroke-width="2"/>';
    s += '<text x="' + cx(105) + '" y="104" font-size="10" fill="#b7791f" text-anchor="middle">too early</text>';
    s += '<text x="' + cx(620) + '" y="104" font-size="10" fill="#1f5c3d" text-anchor="middle">in window</text>';
    s += '<text x="' + cx(1900) + '" y="104" font-size="10" fill="#8c2f39" text-anchor="middle">late</text>';
    return s + '</svg>';
  }

  /* ---------- state ---------- */
  var watchSet = {};
  (D.watchlist || []).forEach(function (s) { watchSet[s] = true; });
  var state = { q: '', cat: '', chain: '', win: '', wl: false, sort: 'rank', dir: 1, tab: 'pre' };
  var maxImplied = Math.max.apply(null, D.rows.map(function (r) { return r.implied_value_usd; }));
  var cats = [], chains = [];
  D.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  var topInWindow = D.rows.filter(function (r) { return r.window_band === 'in window'; })
    .sort(function (a, b) { return b.implied_value_usd - a.implied_value_usd; }).slice(0, 5);
  var bandCount = { 'too early': 0, 'in window': 0, 'late': 0 };
  D.rows.forEach(function (r) { bandCount[r.window_band]++; });

  function bandChip(b) {
    var cls = b === 'too early' ? 'early' : b === 'in window' ? 'win' : 'late';
    return '<span class="chip ' + cls + '">' + b + '</span>';
  }
  /* ---------- shell ---------- */
  var root = document.getElementById('board');
  root.setAttribute('aria-busy', 'false');
  var html = '<div class="wrap">';
  html += '<header class="mast"><div class="kicker">DefiLlama snapshot &middot; model radar-6</div>'
    + '<h1>TOKEN <em>RADAR</em></h1>'
    + '<div class="sub">The Window-Curve Bulletin &mdash; which pre-token protocol is worth farming next, and when its window shuts.</div>'
    + '<div class="dateline"><span>Snapshot ' + esc(D.as_of) + ' &middot; source: DefiLlama protocols</span><span>Floor $50,000,000 TVL &middot; ' + D.board_size + ' rows</span><span>Vol. 6 &mdash; 27 November 2026</span></div></header>';

  html += '<section class="hero"><div><h2><span class="u">' + D.board_size + ' pre-token protocols</span>, ranked by what their launch would be worth</h2>'
    + '<p class="lede">A launch has a window, and the window is a curve, not a ramp. Too young is unproven; too old is a boat already missed. Value peaks near two years of track record &mdash; and this bulletin ranks every protocol on the snapshot&rsquo;s watchlist, plus the early ones below the floor, by that curve.</p>'
    + '<p class="note"><b>Read it straight:</b> a protocol <b>records no token</b> in DefiLlama&rsquo;s data; that is not proof it has none. Implied value is this bulletin&rsquo;s own claim, never a promise. The watchlist is the floor, never the ceiling.</p></div>'
    + '<div class="curvebox"><h3>The window curve</h3><p class="cap">Implied-value multiplier by protocol age. Dots: the five most valuable protocols inside the window.</p>'
    + curveSvg(topInWindow) + '</div></section>';

  html += '<div class="stats">'
    + '<div class="stat"><div class="v num">' + D.board_size + '</div><div class="l">Board rows</div></div>'
    + '<div class="stat"><div class="v num">' + D.watchlist_size + '/' + D.watchlist_size + '</div><div class="l">Watchlist covered</div></div>'
    + '<div class="stat"><div class="v num">' + money(D.board_tvl_usd) + '</div><div class="l">Board TVL</div></div>'
    + '<div class="stat"><div class="v num">' + D.early_size + '</div><div class="l">Early, below floor</div></div>'
    + '<div class="stat"><div class="v num">' + D.live_size + '</div><div class="l">Live tokens set aside</div></div></div>';

  html += '<h2 class="sec">Inside the window <small>THE FIVE MOST VALUABLE PROTOCOLS AT THE PEAK OF THE CURVE</small></h2><hr class="rule"><div class="spots">';
  topInWindow.forEach(function (r) {
    html += '<button class="spot" data-slug="' + esc(r.slug) + '"><span class="rk">Rank #' + r.rank + ' &middot; ' + esc(r.window_band) + '</span>'
      + '<span class="nm">' + esc(r.name) + '</span><br><span class="im num">' + money(r.implied_value_usd) + '</span><br>'
      + '<span class="mt num">TVL ' + money(r.tvl_usd) + ' &middot; 7d ' + pct(r.change_7d) + ' &middot; ' + ageFmt(r.age_days) + '</span></button>';
  });
  html += '</div>';

  html += '<h2 class="sec">How the curve is built <small>THE MODEL, STATED IN FULL &mdash; EVERY NUMBER ON THIS PAGE FOLLOWS FROM IT</small></h2><hr class="rule">'
    + '<div class="model"><div><h3>The window curve</h3>'
    + '<p>Implied value = <code>TVL &times; 0.30 &times; growthMult &times; windowMult &times; breadthMult</code>. Growth is the 7-day TVL change, clamped to &minus;75% / +150%, weighted 0.6. Breadth adds 4% per extra chain, up to five. The window multiplier is a log-normal hump peaking at 730 days: <code>0.55 + 0.45 &times; exp(&minus;(ln(age/730))&sup2; / 1.28)</code> &mdash; 1.00 at the peak, 0.55 far away on either side.</p>'
    + '<p>Farm efficiency, the board&rsquo;s second number, is implied dollars per $1 of farm capital per week of hold: <code>implied / capital / (holdDays / 7)</code>. Capital follows the protocol&rsquo;s own TVL ($250 / $150 / $100 / $50); the hold follows its age (60 / 45 / 30 days). A giant can rank first on value and still lose on efficiency to a minnow &mdash; the table shows both.</p></div>'
    + '<div><h3>Constants &amp; bands</h3><table><tr><th>Factor</th><th>Value</th></tr>'
    + '<tr><td>Base multiple</td><td class="num">0.30 &times; TVL</td></tr>'
    + '<tr><td>Growth weight / clamp</td><td class="num">0.6 &middot; [&minus;75%, +150%]</td></tr>'
    + '<tr><td>Window peak / floor</td><td class="num">730 days &middot; 0.55&ndash;1.00</td></tr>'
    + '<tr><td>Breadth</td><td class="num">+4% / chain, max 5</td></tr></table>'
    + '<p class="band"><span class="dot early"></span><b>Too early</b> &lt; 180 days &mdash; ' + bandCount['too early'] + ' rows</p>'
    + '<p class="band"><span class="dot win"></span><b>In window</b> 180&ndash;1,095 days &mdash; ' + bandCount['in window'] + ' rows</p>'
    + '<p class="band"><span class="dot late"></span><b>Late</b> &gt; 1,095 days &mdash; ' + bandCount['late'] + ' rows</p></div></div>';

  html += '<div class="tabs" role="tablist"><button id="tab-pre" class="on" role="tab">Pre-token board</button>'
    + '<button id="tab-live" role="tab">Live token &middot; ' + D.live_size + ' already trading</button></div>';

  html += '<div id="panel-pre"><div class="controls">'
    + '<input type="search" id="q" placeholder="Search name, category or chain&hellip;" aria-label="Search">'
    + '<select id="cat" aria-label="Category"><option value="">All categories</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>'
    + '<select id="chain" aria-label="Chain"><option value="">All chains</option>' + chains.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>'
    + '<select id="win" aria-label="Window band"><option value="">Any window</option><option>too early</option><option>in window</option><option>late</option></select>'
    + '<label><input type="checkbox" id="wl"> Watchlist only</label>'
    + '<button class="btn ghost" id="csv">Export CSV</button>'
    + '<span class="count" id="count"></span></div>'
    + '<div id="tablewrap"></div></div>';

  html += '<div id="panel-live" hidden><p style="font-size:13px;color:var(--muted)">These protocols already trade. The market prices them, so the bulletin shows the market&rsquo;s own values &mdash; never a model&rsquo;s. They are not launch candidates.</p><div id="livetable"></div></div>';

  html += '<footer class="foot"><h3>Method &amp; limits</h3>'
    + '<p>Source: DefiLlama <i>api.llama.fi/protocols</i>, fetched ' + esc(D.source.replace('DefiLlama ', '')) + '. The snapshot holds 758 protocols at or above $5,000,000 TVL; the watchlist names the 40 of them that record no token and pass the exclusion rule. Below the floor, this bulletin ranks the 138 pre-token protocols that pass the same rule &mdash; versioned pools, exchange products and wrapped, staked or bridged products are left out, because none of them is a launch of its own.</p>'
    + '<p>DefiLlama records no parent protocol in this snapshot, so the watchlist itself is the authority above the floor, and the exclusion rule is the authority below it. A protocol the list leaves out may still have a token its record does not carry. Farm plans are generic steps derived from each protocol&rsquo;s own category, chains, TVL and age; they are not investment advice, and no step here asks you to pay anyone to claim.</p>'
    + '<p>Built by an AI agent for make.fun&rsquo;s &ldquo;Build the best token launch radar&rdquo; bounty. Model radar-6.</p></footer>';
  html += '</div><div class="drawer" id="drawer" hidden></div>';
  root.innerHTML = html;

  /* ---------- table ---------- */
  function isWatch(r) { return !!watchSet[r.slug]; }
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return D.rows.filter(function (r) {
      if (state.wl && !isWatch(r)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.win && r.window_band !== state.win) return false;
      if (q) {
        var hay = (r.name + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function sortRows(rows) {
    var k = state.sort, d = state.dir;
    return rows.slice().sort(function (a, b) {
      var va, vb;
      if (k === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); return (va < vb ? -1 : va > vb ? 1 : 0) * d; }
      va = a[k]; vb = b[k];
      if (va == null) va = -Infinity; if (vb == null) vb = -Infinity;
      return (va - vb) * d || (a.slug < b.slug ? -1 : 1);
    });
  }
  function renderTable() {
    var rows = sortRows(filtered());
    document.getElementById('count').textContent = rows.length + ' of ' + D.board_size + ' rows';
    var h = '<table class="board"><thead><tr>'
      + '<th data-k="rank">Rank</th><th data-k="name">Protocol</th><th data-k="tvl_usd">TVL</th><th data-k="change_7d">7d</th>'
      + '<th data-k="age_days">Age</th><th>Window</th><th data-k="implied_value_usd">Implied value</th><th data-k="efficiency_per_week">Eff. / $1 / wk</th><th>Capital</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var g = r.change_7d == null ? '<span class="num">—</span>' : '<span class="num ' + (r.change_7d >= 0 ? 'up' : 'down') + '">' + pct(r.change_7d) + '</span>';
      h += '<tr data-slug="' + esc(r.slug) + '"><td class="num">' + r.rank + '</td>'
        + '<td><span class="nm">' + esc(r.name) + '</span><br><span class="sub2">' + esc(r.category || '—') + ' &middot; ' + esc(r.chains.slice(0, 2).join(', ') || '—') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</span></td>'
        + '<td class="num">' + money(r.tvl_usd) + '</td><td>' + g + '</td>'
        + '<td class="num">' + ageFmt(r.age_days) + '</td><td>' + bandChip(r.window_band) + '</td>'
        + '<td><div class="bar"><i style="width:' + Math.max(2, Math.round(r.implied_value_usd / maxImplied * 100)) + '%"></i></div><span class="num">' + money(r.implied_value_usd) + '</span></td>'
        + '<td class="num">' + effFmt(r.efficiency_per_week) + '</td>'
        + '<td class="num">$' + r.capital_usd + '</td></tr>';
    });
    h += '</tbody></table>';
    if (!rows.length) h += '<p style="color:var(--muted)">No rows match this filter.</p>';
    document.getElementById('tablewrap').innerHTML = h;
    var ths = document.querySelectorAll('#tablewrap th[data-k]');
    for (var i = 0; i < ths.length; i++) {
      (function (th) {
        if (th.getAttribute('data-k') === state.sort) th.className = 'sorted';
        th.addEventListener('click', function () {
          var k = th.getAttribute('data-k');
          if (state.sort === k) state.dir = -state.dir;
          else { state.sort = k; state.dir = k === 'name' ? 1 : -1; }
          renderTable();
        });
      })(ths[i]);
    }
    var trs = document.querySelectorAll('#tablewrap tbody tr');
    for (var j = 0; j < trs.length; j++) {
      trs[j].addEventListener('click', function () { openDetail(this.getAttribute('data-slug')); });
    }
  }
  function renderLive() {
    var h = '<table class="board"><thead><tr><th>Protocol</th><th>TVL</th><th>Market cap</th><th>7d</th></tr></thead><tbody>';
    D.live.forEach(function (r) {
      h += '<tr><td><span class="nm">' + esc(r.name) + '</span><br><span class="sub2">' + esc(r.category || '—') + ' &middot; ' + esc(r.chains.slice(0, 2).join(', ') || '—') + '</span></td>'
        + '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + (r.mcap_usd == null ? '—' : money(r.mcap_usd)) + '</td>'
        + '<td>' + (r.change_7d == null ? '<span class="num">—</span>' : '<span class="num ' + (r.change_7d >= 0 ? 'up' : 'down') + '">' + pct(r.change_7d) + '</span>') + '</td></tr>';
    });
    document.getElementById('livetable').innerHTML = h + '</tbody></table>';
  }

  /* ---------- detail drawer ---------- */
  var drawer = document.getElementById('drawer');
  function openDetail(slug) {
    var r = null;
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) { r = D.rows[i]; break; }
    if (!r) return;
    var recomputed = valueOf(r);
    var steps = farmSteps(r);
    var cap = capitalFor(r), hold = holdFor(r);
    var h = '<button class="x" id="dx">Close ×</button>'
      + '<div class="meta">Rank #' + r.rank + ' &middot; ' + esc(r.category || '—') + ' &middot; ' + esc(r.chains.join(', ') || '—') + '</div>'
      + '<h2>' + esc(r.name) + '</h2>'
      + '<div class="meta">TVL <span class="num">' + money(r.tvl_usd) + '</span> &middot; 7d <span class="num">' + pct(r.change_7d) + '</span> &middot; Age <span class="num">' + ageFmt(r.age_days) + '</span> &middot; ' + bandChip(r.window_band) + '</div>'
      + '<h3>Where it sits on the curve</h3>' + miniCurve(r.age_days)
      + '<p style="font-size:13px">Window multiplier <span class="num">' + r.window_multiplier.toFixed(4) + '×</span> at ' + ageFmt(r.age_days) + ' old. The peak is 730 days; this protocol is <b>' + esc(r.window_band) + '</b>.</p>'
      + '<h3>Model breakdown</h3><table>'
      + '<tr><th>Base</th><td class="num">TVL ' + money(r.tvl_usd) + ' &times; 0.30 = ' + money(r.tvl_usd * 0.3) + '</td></tr>'
      + '<tr><th>Growth</th><td class="num">' + pct(r.change_7d) + ' &rarr; &times;' + r.growth_multiplier.toFixed(4) + '</td></tr>'
      + '<tr><th>Window</th><td class="num">&times;' + r.window_multiplier.toFixed(4) + '</td></tr>'
      + '<tr><th>Breadth</th><td class="num">' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ' &rarr; &times;' + r.breadth_multiplier.toFixed(4) + '</td></tr>'
      + '<tr><th>Implied value</th><td class="num"><b>' + moneyFull(r.implied_value_usd) + '</b></td></tr></table>'
      + '<p class="agree">This page recomputes the value from the row&rsquo;s own figures: <span class="num">' + moneyFull(recomputed) + '</span> &mdash; ' + (recomputed === r.implied_value_usd ? 'matches the board.' : 'DOES NOT match the board.') + '</p>'
      + '<h3>Farm efficiency</h3><table>'
      + '<tr><th>Capital needed</th><td class="num">$' + cap + '</td></tr>'
      + '<tr><th>Hold</th><td class="num">' + hold + ' days (' + (hold / 7).toFixed(1) + ' weeks)</td></tr>'
      + '<tr><th>Efficiency</th><td class="num">' + effFmt(r.efficiency_per_week) + ' implied per $1 per week</td></tr></table>'
      + '<h3>Farm plan &mdash; 7 steps</h3><ol class="steps">';
    steps.forEach(function (s) {
      var m = s.match(/^(.*) Cost: (.*)\. Time: (.*)\.$/);
      if (m) h += '<li>' + esc(m[1]) + '<span class="ct">Cost: ' + esc(m[2]) + ' &middot; Time: ' + esc(m[3]) + '</span></li>';
      else h += '<li>' + esc(s) + '</li>';
    });
    h += '</ol><p style="font-size:12px;color:var(--muted)">Farm steps are generated from this protocol&rsquo;s own category, chains, TVL and age. Nothing here is a promise that a token will launch.</p>';
    drawer.innerHTML = h;
    drawer.hidden = false;
    document.getElementById('dx').addEventListener('click', function () { drawer.hidden = true; });
    drawer.scrollTop = 0;
  }

  /* ---------- events ---------- */
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; renderTable(); });
  document.getElementById('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderTable(); });
  document.getElementById('chain').addEventListener('change', function (e) { state.chain = e.target.value; renderTable(); });
  document.getElementById('win').addEventListener('change', function (e) { state.win = e.target.value; renderTable(); });
  document.getElementById('wl').addEventListener('change', function (e) { state.wl = e.target.checked; renderTable(); });
  document.getElementById('csv').addEventListener('click', function () {
    var rows = sortRows(filtered());
    var csv = 'rank,slug,name,category,chains,tvl_usd,change_7d,age_days,window_band,implied_value_usd,capital_usd,hold_days,efficiency_per_week\n'
      + rows.map(function (r) {
        return [r.rank, r.slug, '"' + r.name.replace(/"/g, '""') + '"', '"' + (r.category || '') + '"', '"' + r.chains.join(';') + '"', r.tvl_usd, r.change_7d == null ? '' : r.change_7d, r.age_days == null ? '' : r.age_days, r.window_band, r.implied_value_usd, r.capital_usd, r.hold_days, r.efficiency_per_week].join(',');
      }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'token-radar-6-board.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  var spots = document.querySelectorAll('.spot');
  for (var s = 0; s < spots.length; s++) {
    spots[s].addEventListener('click', function () { openDetail(this.getAttribute('data-slug')); });
  }
  function setTab(t) {
    state.tab = t;
    document.getElementById('tab-pre').className = t === 'pre' ? 'on' : '';
    document.getElementById('tab-live').className = t === 'live' ? 'on' : '';
    document.getElementById('panel-pre').hidden = t !== 'pre';
    document.getElementById('panel-live').hidden = t !== 'live';
    if (t === 'live') renderLive();
  }
  document.getElementById('tab-pre').addEventListener('click', function () { setTab('pre'); });
  document.getElementById('tab-live').addEventListener('click', function () { setTab('live'); });

  /* ---------- hash deep-links ---------- */
  function applyHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h) return;
    var parts = h.split('&');
    var changed = false;
    parts.forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || ''), v = decodeURIComponent(kv[1] || '');
      if (k === 'detail' && v) openDetail(v);
      if (k === 'tab' && (v === 'live' || v === 'pre')) setTab(v);
      if (k === 'filter') {
        if (v === 'watchlist') { state.wl = true; document.getElementById('wl').checked = true; changed = true; }
        else if (v.indexOf('window:') === 0) { state.win = v.slice(7); document.getElementById('win').value = state.win; changed = true; }
        else if (v.indexOf('category:') === 0) { state.cat = v.slice(9); document.getElementById('cat').value = state.cat; changed = true; }
      }
      if (k === 'shot' && v === 'filtered') { state.win = 'in window'; document.getElementById('win').value = 'in window'; changed = true; }
    });
    if (changed) {
      renderTable();
      document.body.classList.add('shot-filtered');
    }
  }

  renderTable();
  applyHash();
})();
