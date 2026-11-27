# Token Radar 6: the window-curve bulletin

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/bangfadli121-arch/token-radar-01-entry-muhammad-fadli-r6/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/bangfadli121-arch/token-radar-01-entry-muhammad-fadli-r6/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token-launch radar built for the [make.fun "Build the best token launch radar" bounty](https://make.fun/bounty/token-radar-01) ($1,325). It ranks the pre-token protocols on DefiLlama's snapshot by what their launch would be worth — and by when their window shuts.

## The idea: a launch has a window, and the window is a curve

Rounds before this one ranked protocols by a fitted regression, then by a launch clock. Round 6 asks a different question: **when** is a protocol ripe? Too young is unproven; too old is a boat already missed. Value peaks near two years of track record, so the model is a log-normal hump:

```
implied = TVL × 0.30 × growthMult × windowMult × breadthMult
windowMult = 0.55 + 0.45 × exp(−(ln(age / 730 days))² / (2 × 0.8²))
```

- **Growth** is the 7-day TVL change, clamped to −75% / +150% and weighted 0.6.
- **Breadth** adds 4% per extra chain, up to five.
- **Farm efficiency** is the board's second number: implied dollars per $1 of farm capital per week of hold. Capital follows the protocol's own TVL ($250 / $150 / $100 / $50); the hold follows its age (60 / 45 / 30 days). A giant can rank first on value and still lose on efficiency to a minnow — the table shows both.

The board covers the snapshot's 40-protocol watchlist in full, plus the 138 pre-token protocols below the $50,000,000 floor that pass the watchlist's own exclusion rule (versioned pools, exchange products and wrapped, staked or bridged products are left out — none of them is a launch of its own). The 24 live-token protocols with the largest market caps are set aside on a second tab, shown with the market's own values, never the model's.

## What you get

- A static dashboard (`dashboard/`, no framework, no network): masthead bulletin, the window curve with the top five in-window protocols dotted on it, a spotlight row, the model stated in full, a filterable and sortable board, a detail drawer that recomputes the value live from the row's own figures, and a 7-step farm plan per protocol with capital, hold and cost.
- `board.json`: the ranked board, one row per protocol, with every multiplier and the farm plan.
- `data.js`: the same data for the dashboard.

## Run it

```sh
node main.ts --input input/snapshot.json --output out
# or: MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22, standard library only. The program refuses a board that misses a watchlist slug, is not sorted by implied value, or has fewer than three screenshots in `screenshots/`.

## Honest limits

- A protocol that records no token in DefiLlama's data is not proof it has none.
- Implied value is this bulletin's own claim, never a promise of a launch or a price.
- Farm plans are generic steps derived from each protocol's own category, chains, TVL and age; they are not investment advice, and no step asks you to pay anyone to claim.

<sub>Entered on [make.fun](https://make.fun/?ref=8y9pksda&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
