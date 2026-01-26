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

// Track disconnection notification timers
const disconnectionTimers = new Map<string, NodeJS.Timeout>(); // playerId -> timer

const DISCONNECTION_NOTIFY_DELAY = 60000; // 1 minute

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

// Broadcast a specific message to all connected players in a game
function broadcastMessageToGame(gameId: string, message: ServerMessage, excludePlayerId?: string): void {
  clients.forEach((client, ws) => {
    if (client.gameId === gameId && client.playerId !== excludePlayerId) {
      if (ws.readyState === WebSocket.OPEN) {
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
            const game = gameManager.createGame(message.playerName, client.playerId, message.gameFormat || "traditional");
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
            const game = gameManager.createSinglePlayerGame(message.playerName, client.playerId, cpuCount, message.gameFormat || "traditional");
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
            const game = gameManager.createOlympicsGame(message.playerName, client.playerId, message.countryCode, message.gameFormat || "traditional");
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

          case "reconnect": {
            // Clear any pending disconnection timer for the old playerId
            const existingTimer = disconnectionTimers.get(message.playerId);
            if (existingTimer) {
              clearTimeout(existingTimer);
              disconnectionTimers.delete(message.playerId);
            }

            // Attempt to reconnect to an existing game with the old playerId
            const game = gameManager.reconnectPlayer(message.playerId, message.gameId, client.playerId);

            if (!game) {
              sendError(ws, "Could not reconnect to game. The game may have ended or your session expired.");
              return;
            }

            client.gameId = game.state.id;

            // Find the reconnected player and clear disconnection status
            const reconnectedPlayer = game.state.players.find(p => p.id === client.playerId);
            if (reconnectedPlayer) {
              const wasDisconnected = !reconnectedPlayer.isConnected || reconnectedPlayer.disconnectedAt;
              const wasCPUControlled = reconnectedPlayer.isCPUControlled;

              reconnectedPlayer.isConnected = true;
              reconnectedPlayer.disconnectedAt = undefined;
              reconnectedPlayer.isCPUControlled = false;

              // Clear any pending votes for this player
              if (game.state.cpuReplacementVotes) {
                delete game.state.cpuReplacementVotes[message.playerId];
                delete game.state.cpuReplacementVotes[client.playerId];
              }

              // Notify other players of reconnection (for multiplayer games)
              if (!game.state.isSinglePlayer && !game.state.isOlympics && (wasDisconnected || wasCPUControlled)) {
                broadcastMessageToGame(game.state.id, {
                  type: "player_reconnected",
                  playerName: reconnectedPlayer.name,
                  playerId: client.playerId,
                }, client.playerId);
              }
            }

            // Set up state update callback for single player/Olympics games
            if (game.state.isSinglePlayer || game.state.isOlympics) {
              game.setOnStateUpdate(() => {
                sendToClient(ws, {
                  type: "game_state",
                  state: game.getStateForPlayer(client.playerId),
                  playerId: client.playerId,
                });
              });
            }

            sendToClient(ws, {
              type: "game_joined",
              playerId: client.playerId,
            });

            sendToClient(ws, {
              type: "game_state",
              state: game.getStateForPlayer(client.playerId),
              playerId: client.playerId,
            });

            // Broadcast updated state to all players
            broadcastToGame(game);

            console.log(`Player reconnected: old=${message.playerId}, new=${client.playerId}, game=${game.state.id}`);
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
            
            const callResult = game.makeCall(client.playerId, message.call);
            if (!callResult.success) {
              sendError(ws, callResult.error || "Invalid call");
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

          // Keller format actions
          case "start_blind_rounds": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.startBlindRounds(client.playerId)) {
              sendError(ws, "Cannot start blind rounds");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "start_blind_rounds_now": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.startBlindRoundsNow(client.playerId)) {
              sendError(ws, "Cannot start blind rounds now");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "decline_blind_round_one": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.declineBlindRoundOne(client.playerId)) {
              sendError(ws, "Cannot decline blind round one");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "use_swap": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.useSwap(client.playerId, message.cardToSwap)) {
              sendError(ws, "Cannot swap card");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "halo_guess": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.haloGuess(client.playerId, message.guess)) {
              sendError(ws, "Invalid Halo guess");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "halo_bank": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.haloBank(client.playerId)) {
              sendError(ws, "Cannot bank Halo score");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "halo_continue": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.haloContinue()) {
              sendError(ws, "Cannot continue from Halo");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "brucie_guess": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.brucieGuess(client.playerId, message.guess)) {
              sendError(ws, "Invalid Brucie guess");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "brucie_bank": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.brucieBank(client.playerId)) {
              sendError(ws, "Cannot bank Brucie bonus");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "skip_brucie": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.skipBrucie(client.playerId)) {
              sendError(ws, "Cannot skip Brucie bonus");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "brucie_continue": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            if (!game.brucieContinue()) {
              sendError(ws, "Cannot continue from Brucie Bonus");
              return;
            }

            broadcastToGame(game);
            break;
          }

          case "restore_saved_game": {
            const game = gameManager.restoreSavedGame(message.savedState, client.playerId);
            if (!game) {
              sendError(ws, "Could not restore saved game");
              return;
            }

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

            // If in playing or calling phase, trigger CPU processing
            if (game.state.phase === "calling" || game.state.phase === "playing") {
              game.triggerCPUProcessingIfNeeded();
            }
            break;
          }

          case "minigame_acknowledge": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            // Call appropriate acknowledge based on current phase
            if (game.state.phase === "halo_minigame") {
              game.haloAcknowledge();
            } else if (game.state.phase === "brucie_bonus") {
              game.brucieAcknowledge();
            }

            broadcastToGame(game);
            break;
          }

          case "vote_cpu_replacement": {
            const game = gameManager.getGameForPlayer(client.playerId);
            if (!game) {
              sendError(ws, "Game not found");
              return;
            }

            // Only valid for multiplayer games
            if (game.state.isSinglePlayer || game.state.isOlympics) {
              sendError(ws, "CPU replacement voting is only for multiplayer games");
              return;
            }

            const disconnectedPlayerId = message.disconnectedPlayerId;
            const vote = message.vote;

            // Check if the target player exists and is actually disconnected
            const disconnectedPlayer = game.state.players.find(p => p.id === disconnectedPlayerId);
            if (!disconnectedPlayer || disconnectedPlayer.isConnected) {
              sendError(ws, "Player is not disconnected");
              return;
            }

            // Initialize votes if needed
            if (!game.state.cpuReplacementVotes) {
              game.state.cpuReplacementVotes = {};
            }
            if (!game.state.cpuReplacementVotes[disconnectedPlayerId]) {
              game.state.cpuReplacementVotes[disconnectedPlayerId] = [];
            }

            const votes = game.state.cpuReplacementVotes[disconnectedPlayerId];

            if (vote) {
              // Add vote if not already voted
              if (!votes.includes(client.playerId)) {
                votes.push(client.playerId);
              }
            } else {
              // Remove vote
              const idx = votes.indexOf(client.playerId);
              if (idx !== -1) {
                votes.splice(idx, 1);
              }
            }

            // Count how many connected non-CPU players there are (excluding the disconnected one)
            const connectedHumanPlayers = game.state.players.filter(
              p => !p.isCPU && p.isConnected && p.id !== disconnectedPlayerId
            );
            const votesNeeded = connectedHumanPlayers.length;
            const currentVotes = votes.length;

            // Broadcast vote update
            broadcastMessageToGame(game.state.id, {
              type: "cpu_replacement_vote_update",
              disconnectedPlayerId,
              disconnectedPlayerName: disconnectedPlayer.name,
              votesNeeded,
              currentVotes,
            });

            // Check if unanimous
            if (currentVotes >= votesNeeded && votesNeeded > 0) {
              // Activate CPU replacement
              disconnectedPlayer.isCPUControlled = true;

              // Clear votes
              delete game.state.cpuReplacementVotes[disconnectedPlayerId];

              // Notify all players
              broadcastMessageToGame(game.state.id, {
                type: "cpu_replacement_activated",
                playerName: disconnectedPlayer.name,
              });

              // If it's this player's turn, trigger CPU processing
              const currentTurnPlayer = game.state.players[game.state.currentPlayerIndex];
              if (currentTurnPlayer && currentTurnPlayer.id === disconnectedPlayerId) {
                game.triggerCPUProcessingForDisconnectedPlayer();
              }
            }

            broadcastToGame(game);
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
        if (game) {
          if (game.state.phase === "lobby") {
            // In lobby, just remove the player
            gameManager.removePlayer(client.playerId);
            broadcastToGame(game);
          } else if (!game.state.isSinglePlayer && !game.state.isOlympics) {
            // In multiplayer game, mark player as disconnected
            const player = game.state.players.find(p => p.id === client.playerId);
            if (player && !player.isCPU) {
              player.isConnected = false;
              player.disconnectedAt = new Date().toISOString();

              // Start timer to notify other players after 1 minute
              const timerId = setTimeout(() => {
                disconnectionTimers.delete(client.playerId);
                // Check if player is still disconnected
                const currentGame = gameManager.getGame(game.state.id);
                if (currentGame) {
                  const currentPlayer = currentGame.state.players.find(p => p.id === client.playerId);
                  if (currentPlayer && !currentPlayer.isConnected && currentPlayer.disconnectedAt) {
                    // Notify other players
                    broadcastMessageToGame(game.state.id, {
                      type: "player_disconnected",
                      playerName: currentPlayer.name,
                      playerId: client.playerId,
                    });
                    // Initialize vote tracking for this player
                    if (!currentGame.state.cpuReplacementVotes) {
                      currentGame.state.cpuReplacementVotes = {};
                    }
                    currentGame.state.cpuReplacementVotes[client.playerId] = [];
                    broadcastToGame(currentGame);
                  }
                }
              }, DISCONNECTION_NOTIFY_DELAY);

              disconnectionTimers.set(client.playerId, timerId);
              broadcastToGame(game);
            }
          }
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
