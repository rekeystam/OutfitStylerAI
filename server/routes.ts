import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWardrobeItemSchema, insertOutfitSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wardrobe Items Routes
  app.post("/api/wardrobe-items/check-duplicates", async (req, res) => {
    try {
      const validatedData = insertWardrobeItemSchema.parse(req.body);
      const duplicates = await storage.findDuplicateItems(validatedData.userId || 1, validatedData);
      res.json({ duplicates });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.post("/api/wardrobe-items", async (req, res) => {
    try {
      const validatedData = insertWardrobeItemSchema.parse(req.body);
      const item = await storage.createWardrobeItem(validatedData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.get("/api/wardrobe-items/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const items = await storage.getWardrobeItems(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
    }
  });

  app.patch("/api/wardrobe-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.updateWardrobeItem(id, req.body);
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
    }
  });

  app.delete("/api/wardrobe-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWardrobeItem(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
    }
  });

  // Outfits Routes
  app.post("/api/outfits", async (req, res) => {
    try {
      const validatedData = insertOutfitSchema.parse(req.body);
      const outfit = await storage.createOutfit(validatedData);
      res.json(outfit);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.get("/api/outfits/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const outfits = await storage.getOutfits(userId);
      res.json(outfits);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
    }
  });

  app.delete("/api/outfits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteOutfit(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Outfit not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
