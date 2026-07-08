Title: Production-Ready Web-Based Spider Solitaire with Cosmic UI and "Quantum Timeline" Mechanics

### Role & Objective
You are an expert Senior Frontend Engineer and Game Developer specializing in highly interactive, responsive web applications. Your task is to build a production-ready, beautiful, web-based Spider Solitaire game from scratch. The game must feature modern, fluid "stellar/cosmic" visual effects, rock-solid card mechanics, standard modern quality-of-life features, and an industry-first innovative feature: "The Quantum Timeline & Nebula Insights".

### Tech Stack
- Framework: React (Vite) or Next.js (Client-side focused)
- Styling: Tailwind CSS
- Animations & Physics: Framer Motion (for UI/cards) or Canvas/PixiJS (if required for heavy particle effects, but prefer CSS/Framer Motion for accessibility and crisp rendering)
- State Management: React Context or Zustand (to handle complex undo/redo and timeline states)
- Icons: Lucide React

---

### 1. Core Mechanics & Game Rules
Implement standard Spider Solitaire rules with 100% accuracy:
- Deck Setup: 2 full decks (104 cards). 10 tableau columns (4 columns of 6 cards, 6 columns of 5 cards). Remaining 50 cards in the stock pile (5 deals of 10 cards).
- Game Modes: 1 Suit (Spades - Easy), 2 Suits (Spades/Hearts - Medium), 4 Suits (All - Hard).
- Movement Rules: 
  - Cards can be moved onto a card that is exactly 1 rank higher (e.g., 4 on a 5), regardless of suit.
  - A group of cards can only be moved together if they are in descending order and of the identical suit.
  - Empty tableau spaces can be filled by any card or valid run of cards.
- Winning condition: Assembling a full sequence from King down to Ace within the same suit automatically clears it to the foundation. Game wins when all 8 sequences are cleared.

---

### 2. Modern UI/UX & "Stellar" Graphics
The theme is "Cosmic/Nebula". It should feel deeply immersive, dark, and premium.
- Visuals: Deep space gradient background with subtle, slow-moving CSS particle stars. 
- Cards: Modern, minimalist card designs with glowing neon borders for selected cards. Card backs should feature a sleek geometric galaxy or nebula pattern.
- Controls: 
  - Smooth Drag-and-Drop (with magnetic snapping to columns).
  - Tap-to-Move (smart click: automatically moves a card/stack to the most optimal valid position).
  - Responsive layout that scales perfectly from desktop down to mobile viewports (portrait and landscape).
- Feedback: Micro-interactions like satisfying card-flip animations, subtle screen shake on full suit clears, and neon particle explosions when a suit is sent to the foundation.

---

### 3. Standard Modern Quality-of-Life Features
- Unlimited Undo/Redo: Track the entire state history.
- Smart Hint System: Highlights valid moves. If multiple exist, cycle through them prioritizing suit-matching moves.
- Auto-Collect/Autocomplete: When the game is mathematically won (all cards face up and no stock remaining), automatically fly the remaining cards to the foundations with an elegant animation sequence.
- Statistics Dashboard: Tracks Win/Loss ratio, fastest time, fewest moves, current streak, and high scores per difficulty tier.
- Auto-Save State: Automatically save the game state to LocalStorage so the user can close the tab and resume flawlessly.

---

### 4. THE STANDOUT FEATURE: "The Quantum Deck & Nebula Insights"
You must implement a groundbreaking feature never before seen in traditional Spider Solitaire, split into two parts:

#### Part A: Quantum Timeline Branching (In-Game)
- Create a "Split Timeline" button. 
- If a player reaches a difficult crossroads in their strategy, they can click "Split Timeline". This creates a visual "Parallel Universe" tab at the top of the screen (e.g., "Timeline Alpha", "Timeline Beta").
- The player can play down Timeline Beta. If they hit a dead end, they can instantly click back to Timeline Alpha to try a different strategy from that exact snapshot. They can maintain up to 3 parallel timelines simultaneously.

#### Part B: Nebula Insights Engine (Post-Game Chess-Style Analysis)
- When a game ends (either Victory or when the player chooses to "Resign/Analyze"), generate a **Chess.com-style Post-Game Review Dashboard**.
- Back-calculate the entire move tree played by the user and categorize key turns:
  - **Brilliant Move:** A move that was the *only* mathematical path to uncovering a hidden card or unlocking a stuck column.
  - **Excellent/Good Move:** Standard optimal progression.
  - **Inaccuracy:** Moving a card to a column that blocks a future same-suit run when a better option was available.
  - **Blunder:** A move that mathematically sealed a dead end or permanently buried a crucial card under an un-movable stack.
- Show an **"Accuracy Percentage"** score and an interactive linear graph charting their "Win Probability" spike or dip over the course of their total moves. Allow them to click any point on the graph to see a mini-map overlay of what the board looked like at that exact turn.

---

### Development Roadmap & Iteration Steps
Please build the game systematically, confirming stability at each stage:
1. **Phase 1: Basic Engine & State.** Set up the card deck generation, shuffling algorithms, and strict Spider Solitaire movement validation logic.
2. **Phase 2: Visual Layout.** Implement the cosmic-themed Tailwind layout, tableau columns, stock pile, and responsive CSS grid/flexboxes.
3. **Phase 3: Interactions & Animations.** Integrate Framer Motion for drag-and-drop, tap-to-move, dealing animations, and card flipping.
4. **Phase 4: Game States & QOL.** Build the undo/redo stacks, auto-save, hint engine, and statistics tracker.
5. **Phase 5: The Quantum Feature.** Program the timeline branching state management and the post-game tree analysis parser for the Nebula Insights graph.

Begin by setting up the project structure and generating the foundational card deck logic. Ask me questions if you need clarification on rules or state mapping before writing code.