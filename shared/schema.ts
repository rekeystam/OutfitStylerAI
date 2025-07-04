import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const wardrobeItems = pgTable("wardrobe_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  category: text("category").notNull(), // tops, bottoms, dresses, shoes, socks, accessories
  subcategory: text("subcategory"), // blouses, shirts, t-shirts, heels, flats, etc.
  colors: text("colors").array().notNull(), // array of color names
  primaryColor: text("primary_color"), // main color for matching
  secondaryColor: text("secondary_color"), // accent color
  image: text("image").notNull(), // base64 image data
  photoHash: text("photo_hash").notNull(), // hash of the image for duplicate detection
  style: text("style"), // detailed style description for differentiation
  styleTags: text("style_tags").array().default([]).notNull(), // casual, formal, sporty, elegant
  wearCount: integer("wear_count").default(0).notNull(),
  occasions: text("occasions").array().default([]).notNull(), // date, work, party, casual, etc.
  gender: text("gender").default("female").notNull(), // female, male, unisex
  layerable: boolean("layerable").default(false).notNull(), // can be layered
  versatility: text("versatility"), // description of versatility
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outfits = pgTable("outfits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  occasion: text("occasion").notNull(),
  itemIds: integer("item_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWardrobeItemSchema = createInsertSchema(wardrobeItems).omit({
  id: true,
  createdAt: true,
}).extend({
  photoHash: z.string().optional(),
  style: z.string().optional(),
  subcategory: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  versatility: z.string().optional(),
});

export const insertOutfitSchema = createInsertSchema(outfits).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = z.infer<typeof insertWardrobeItemSchema>;
export type Outfit = typeof outfits.$inferSelect;
export type InsertOutfit = z.infer<typeof insertOutfitSchema>;
