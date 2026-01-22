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
- CPU AI calls based on hand strength (high cards, trump cards)
- CPU plays strategically to win tricks when needed
- 1-1.5 second delays between CPU moves for natural feel

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
