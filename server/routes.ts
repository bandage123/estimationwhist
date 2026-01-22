import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./wsHandler";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up WebSocket server for multiplayer game
  setupWebSocket(httpServer);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
