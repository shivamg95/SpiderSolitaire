# Spider Solitaire Rules

Canonical rules for the engine. Tests cite this document.

## Deck

- 104 cards total.
- **1-suit**: 8 copies of A–K in spades (`S`).
- **2-suit**: 4 copies of A–K in spades (`S`) and hearts (`H`).
- **4-suit**: 2 copies of A–K in spades, hearts, diamonds (`D`), and clubs (`C`).
- Ranks: `1=A … 13=K`. Card ids: `` `${Suit}${Rank}#${copy}` ``.

## Deal

- Deal 54 cards into 10 columns: columns `0–3` get 6 cards, columns `4–9` get 5.
- Only the last card of each column is face up (44 face-down).
- Stock holds 5 deals of 10 cards (50 remaining).

## Moves

- A **movable group** is a same-suit, strictly descending run of face-up cards ending at the column tail.
- A run may be placed on a card of rank `+1` of **any** suit, or onto an empty column.
- Stock deal is blocked while any column is empty unless setting `allowDealWithEmptyColumn` is on (default off).

## Foundations and win

- A complete same-suit `K→A` run in a column is auto-removed to a foundation.
- Auto-flip of a newly exposed card and foundation removal are deterministic consequences of a move (effects), never separate log entries.
- Win condition: 8 foundations filled.

## Scoring

### Standard

- Start at 500.
- −1 per move.
- −1 per undo when `undoPenalty` is on (default on).
- +100 per foundation.

### Vegas (house rule)

- Bankroll persists across games.
- −$500 buy-in per deal.
- +$100 per foundation.
- +$50 time-bonus tiers (documented in scoring tests).

## Timer

Timer accrues only while the tab is visible and the game is not paused.
