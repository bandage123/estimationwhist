import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { randomUUID } from "crypto";
import { gameManager, Game } from "./gameLogic";
import { ClientMessage, ServerMessage } from "@shared/schema";

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  gameId: string | null;
}

const clients = new Map<WebSocket, ConnectedClient>();

function broadcastToGame(game: Game, excludePlayerId?: string): void {
  clients.forEach((client, ws) => {
    if (client.gameId === game.state.id && client.playerId !== excludePlayerId) {
      if (ws.readyState === WebSocket.OPEN) {
        const message: ServerMessage = {
          type: "game_state",
          state: game.getStateForPlayer(client.playerId),
          playerId: client.playerId,
        };
        ws.send(JSON.stringify(message));
      }
    }
  });
}

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string): void {
  sendToClient(ws, { type: "error", message });
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    const playerId = randomUUID();
    clients.set(ws, { ws, playerId, gameId: null });

    ws.on("message", (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        const client = clients.get(ws);
        if (!client) return;

        switch (message.type) {
          case "create_game": {
            const game = gameManager.createGame(message.playerName, client.playerId);
            client.gameId = game.state.id;
            
            // Set up state update callback for CPU players
            game.setOnStateUpdate(() => {
              broadcastToGame(game);
            });
            
            sendToClient(ws, {
              type: "game_created",
              gameId: game.state.id,
              playerId: client.playerId,
            });
            
            sendToClient(ws, {
              type: "game_state",
              state: game.getStateForPlayer(client.playerId),
              playerId: client.playerId,
            });
            break;
          }

          case "create_single_player_game": {
            const cpuCount = Math.max(1, Math.min(6, message.cpuCount));
            const game = gameManager.createSinglePlayerGame(message.playerName, client.playerId, cpuCount);
            client.gameId = game.state.id;
            
            // Set up state update callback for CPU players
            game.setOnStateUpdate(() => {
              sendToClient(ws, {
                type: "game_state",
                state: game.getStateForPlayer(client.playerId),
                playerId: client.playerId,
              });
            });
            
            sendToClient(ws, {
              type: "game_created",
              gameId: game.state.id,
              playerId: client.playerId,
            });
            
            sendToClient(ws, {
              type: "game_state",
              state: game.getStateForPlayer(client.playerId),
              playerId: client.playerId,
            });
            break;
          }

          case "create_olympics_game": {
            const game = gameManager.createOlympicsGame(message.playerName, client.playerId, message.countryCode, message.adjective);
            client.gameId = game.state.id;
            
            // Set up state update callback
            game.setOnStateUpdate(() => {
              sendToClient(ws, {
                type: "game_state",
                state: game.getStateForPlayer(client.playerId),
                playerId: client.playerId,
              });
            });
            
            sendToClient(ws, {
              type: "game_created",
              gameId: game.state.id,
              playerId: client.playerId,
            });
            
            sendToClient(ws, {
              type: "game_state",
              state: game.getStateForPlayer(client.playerId),
              playerId: client.playerId,
            });
            break;
          }

          case "join_game": {
            const game = gameManager.joinGame(
              message.gameId.toUpperCase(),
              message.playerName,
              client.playerId
            );
            
            if (!game) {
              sendError(ws, "Could not join game. It may be full or already started.");
              return;
            }
            
            client.gameId = game.state.id;
            
            sendToClient(ws, {
              type: "game_joined",
              playerId: client.playerId,
            });
            
            // Broadcast updated state to all players
            broadcastToGame(game);
            
            sendToClient(ws, {
              type: "game_state",
              state: game.getStateForPlayer(client.playerId),
              playerId: client.playerId,
            });
            break;
          }

          case "start_game": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            // Only host (first player) can start
            if (game.state.players[0]?.id !== client.playerId) {
              sendError(ws, "Only the host can start the game");
              return;
            }
            
            if (!game.startGame()) {
              sendError(ws, "Cannot start game. Need 2-7 players.");
              return;
            }
            
            // Set up periodic state broadcasts during dealer determination
            const broadcastInterval = setInterval(() => {
              if (game.state.phase !== "determining_dealer") {
                clearInterval(broadcastInterval);
              }
              broadcastToGame(game);
            }, 500);
            
            broadcastToGame(game);
            break;
          }

          case "make_call": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            if (!game.makeCall(client.playerId, message.call)) {
              sendError(ws, "Invalid call");
              return;
            }
            
            broadcastToGame(game);
            
            // Trigger CPU processing if next player is CPU (for single player or Olympics)
            game.triggerCPUProcessingIfNeeded();
            break;
          }

          case "play_card": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.playCard(client.playerId, message.card)) {
              sendError(ws, "Invalid card play");
              return;
            }

            broadcastToGame(game);

            // Trigger CPU processing if next player is CPU (for single player or Olympics)
            game.triggerCPUProcessingIfNeeded();

            // Broadcast again after trick resolution (scaled by speed)
            setTimeout(() => {
              broadcastToGame(game);
            }, 2100 * game.getSpeed());
            break;
          }

          case "next_round": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            // Only host can advance rounds
            if (game.state.players[0]?.id !== client.playerId) {
              sendError(ws, "Only the host can advance the round");
              return;
            }
            
            game.nextRound();
            broadcastToGame(game);
            break;
          }

          case "next_olympics_game": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            // Only host can advance
            if (game.state.players[0]?.id !== client.playerId) {
              sendError(ws, "Only you can advance the tournament");
              return;
            }
            
            game.nextOlympicsGame();
            broadcastToGame(game);
            break;
          }

          case "start_olympics_qualifying": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            game.startOlympicsQualifying();
            broadcastToGame(game);
            break;
          }

          case "start_olympics_finals": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }
            
            game.startOlympicsFinals();
            broadcastToGame(game);
            break;
          }

          case "set_speed": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (game) {
              game.setSpeed(message.speed);
            }
            break;
          }

          case "request_state": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (game) {
              sendToClient(ws, {
                type: "game_state",
                state: game.getStateForPlayer(client.playerId),
                playerId: client.playerId,
              });
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        sendError(ws, "Invalid message format");
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        const game = gameManager.getGameForPlayer(client.playerId);
        if (game && game.state.phase === "lobby") {
          gameManager.removePlayer(client.playerId);
          broadcastToGame(game);
        }
        clients.delete(ws);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });
}
