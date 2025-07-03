import { 
  users, 
  wardrobeItems, 
  outfits,
  type User, 
  type InsertUser,
  type WardrobeItem,
  type InsertWardrobeItem,
  type Outfit,
  type InsertOutfit
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wardrobe Items
  createWardrobeItem(item: InsertWardrobeItem): Promise<WardrobeItem>;
  getWardrobeItems(userId: number): Promise<WardrobeItem[]>;
  updateWardrobeItem(id: number, updates: Partial<WardrobeItem>): Promise<WardrobeItem | undefined>;
  deleteWardrobeItem(id: number): Promise<boolean>;
  findDuplicateItems(userId: number, item: InsertWardrobeItem): Promise<WardrobeItem[]>;
  
  // Outfits
  createOutfit(outfit: InsertOutfit): Promise<Outfit>;
  getOutfits(userId: number): Promise<Outfit[]>;
  deleteOutfit(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wardrobeItems: Map<number, WardrobeItem>;
  private outfits: Map<number, Outfit>;
  private currentUserId: number;
  private currentWardrobeItemId: number;
  private currentOutfitId: number;

  constructor() {
    this.users = new Map();
    this.wardrobeItems = new Map();
    this.outfits = new Map();
    this.currentUserId = 1;
    this.currentWardrobeItemId = 1;
    this.currentOutfitId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wardrobe Items
  async createWardrobeItem(insertItem: InsertWardrobeItem): Promise<WardrobeItem> {
    const id = this.currentWardrobeItemId++;
    const item: WardrobeItem = { 
      id,
      name: insertItem.name,
      category: insertItem.category,
      colors: insertItem.colors,
      image: insertItem.image,
      photoHash: insertItem.photoHash || "",
      style: insertItem.style || null,
      userId: insertItem.userId || null,
      wearCount: insertItem.wearCount || 0,
      occasions: insertItem.occasions || [],
      createdAt: new Date()
    };
    this.wardrobeItems.set(id, item);
    return item;
  }

  async findDuplicateItems(userId: number, item: InsertWardrobeItem): Promise<WardrobeItem[]> {
    const userItems = Array.from(this.wardrobeItems.values()).filter(
      (existingItem) => existingItem.userId === userId
    );

    return userItems.filter(existingItem => {
      // Check for photo hash match (exact photo duplicate)
      if (item.photoHash && existingItem.photoHash === item.photoHash) {
        return true;
      }

      // Check for attribute-based duplicates
      const nameMatch = existingItem.name.toLowerCase().trim() === item.name.toLowerCase().trim();
      const categoryMatch = existingItem.category.toLowerCase() === item.category.toLowerCase();
      
      // Check if colors arrays are identical (order doesn't matter)
      const existingColors = existingItem.colors.map(c => c.toLowerCase()).sort();
      const newColors = item.colors.map(c => c.toLowerCase()).sort();
      const colorsMatch = JSON.stringify(existingColors) === JSON.stringify(newColors);

      // Check style if both items have style descriptions
      let styleMatch = true;
      if (existingItem.style && item.style) {
        styleMatch = existingItem.style.toLowerCase().trim() === item.style.toLowerCase().trim();
      }

      return nameMatch && categoryMatch && colorsMatch && styleMatch;
    });
  }

  async getWardrobeItems(userId: number): Promise<WardrobeItem[]> {
    return Array.from(this.wardrobeItems.values()).filter(
      (item) => item.userId === userId,
    );
  }

  async updateWardrobeItem(id: number, updates: Partial<WardrobeItem>): Promise<WardrobeItem | undefined> {
    const item = this.wardrobeItems.get(id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      this.wardrobeItems.set(id, updatedItem);
      return updatedItem;
    }
    return undefined;
  }

  async deleteWardrobeItem(id: number): Promise<boolean> {
    return this.wardrobeItems.delete(id);
  }

  // Outfits
  async createOutfit(insertOutfit: InsertOutfit): Promise<Outfit> {
    const id = this.currentOutfitId++;
    const outfit: Outfit = { 
      id,
      name: insertOutfit.name,
      occasion: insertOutfit.occasion,
      itemIds: insertOutfit.itemIds,
      userId: insertOutfit.userId || null,
      createdAt: new Date()
    };
    this.outfits.set(id, outfit);
    return outfit;
  }

  async getOutfits(userId: number): Promise<Outfit[]> {
    return Array.from(this.outfits.values()).filter(
      (outfit) => outfit.userId === userId,
    );
  }

  async deleteOutfit(id: number): Promise<boolean> {
    return this.outfits.delete(id);
  }
}

export const storage = new MemStorage();
