# Estimation Whist - Multiplayer Card Game

## Overview
A real-time multiplayer Estimation Whist card game for 2-7 players. Players estimate how many tricks they will win each round, with scoring based on accuracy of predictions.

## Game Rules
- 13 rounds total with varying card counts (7→1→7) and trump suits
- Dealer determined by highest card drawn
- Calling phase: Players predict tricks, dealer cannot call a number making total equal card count
- Playing phase: Must follow lead suit if possible, trumps beat all other suits
- Scoring: 0 if under, tricks won if over, 10+tricks if exact prediction
- Final round (13) has double points

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter
- **Backend**: Express, WebSocket (ws library)
- **State Management**: In-memory game state on server

## Project Structure
```
client/src/
├── components/
│   ├── PlayingCard.tsx    # Card rendering with suit colors
│   ├── PlayerHand.tsx     # Hand display with card selection
│   ├── TrickArea.tsx      # Current trick display
│   ├── ScoreBoard.tsx     # Scores and round history
│   ├── CallDialog.tsx     # Trick calling interface
│   ├── Lobby.tsx          # Game creation/joining
│   ├── DealerDetermination.tsx
│   └── RoundEndDisplay.tsx
├── hooks/
│   └── useWebSocket.ts    # WebSocket connection management
├── pages/
│   └── Game.tsx           # Main game page
server/
├── gameLogic.ts           # Game state management, rules
├── wsHandler.ts           # WebSocket message handling
├── routes.ts              # Express routes
shared/
└── schema.ts              # TypeScript types, game configuration
```

## Key Features
- Real-time multiplayer via WebSocket
- Single-player mode with 1-6 CPU opponents
- CPU AI with intelligent calling and card playing
- Game code system for easy joining (multiplayer)
- Automatic dealer rotation
- Trump suit changes each round
- Complete 13-round game flow
- Detailed scoreboard with round history

## Single Player Mode
- CPU players: Alice, Bob, Charlie, Diana, Edward, Fiona
- 1-1.5 second delays between CPU moves for natural feel

### CPU Calling Logic
- Trump cards valued highly: Ace (~95%), King (~85%), Queen (~70%), J/10 (~50%), low trump (~30%)
- Non-trump high cards: Ace (~80%), King (~55%), Queen (~35%), scaled by player count
- Singleton/doubleton high cards considered weaker (vulnerable to trumping)
- Void in a suit + trump cards = small bonus (opportunity to trump in)
- Dealer restriction handled by adjusting toward expected wins direction

### CPU Playing Logic
- Leads high cards when needing tricks, low cards when not
- When following: tries to win if needs tricks, otherwise plays low
- Follows suit rules correctly (must follow lead suit if possible)

## Round Configuration
| Round | Cards | Trump    | Special |
|-------|-------|----------|---------|
| 1     | 7     | Clubs    |         |
| 2     | 6     | Diamonds |         |
| 3     | 5     | Hearts   |         |
| 4     | 4     | Spades   |         |
| 5     | 3     | None     |         |
| 6     | 2     | Clubs    |         |
| 7     | 1     | Diamonds |         |
| 8     | 2     | Hearts   |         |
| 9     | 3     | Spades   |         |
| 10    | 4     | None     |         |
| 11    | 5     | Clubs    |         |
| 12    | 6     | Diamonds |         |
| 13    | 7     | Hearts   | 2x Points |

## Development
- Run: `npm run dev`
- Server runs on port 5000
- WebSocket endpoint: `/ws`
