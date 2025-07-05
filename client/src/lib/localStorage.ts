
export interface StoredWardrobeItem {
  id: number;
  name: string;
  category: string;
  subcategory?: string | null;
  colors: string[];
  primaryColor?: string | null;
  secondaryColor?: string | null;
  image?: string | null;
  photoHash?: string;
  style?: string | null;
  styleTags?: string[];
  userId?: number | null;
  wearCount?: number;
  occasions?: string[];
  gender?: string;
  layerable?: boolean;
  versatility?: number | null;
  createdAt: Date;
}

export interface StoredOutfit {
  id: number;
  name: string;
  occasion: string;
  itemIds: number[];
  userId?: number | null;
  createdAt: Date;
}

const WARDROBE_ITEMS_KEY = 'wardrobe_items';
const OUTFITS_KEY = 'outfits';
const USER_ID_KEY = 'current_user_id';

export class LocalStorageManager {
  static setUserId(userId: number): void {
    localStorage.setItem(USER_ID_KEY, userId.toString());
  }

  static getUserId(): number {
    const stored = localStorage.getItem(USER_ID_KEY);
    return stored ? parseInt(stored, 10) : 1;
  }

  static saveWardrobeItems(items: StoredWardrobeItem[]): void {
    localStorage.setItem(WARDROBE_ITEMS_KEY, JSON.stringify(items));
  }

  static getWardrobeItems(): StoredWardrobeItem[] {
    const stored = localStorage.getItem(WARDROBE_ITEMS_KEY);
    if (!stored) return [];
    
    try {
      const items = JSON.parse(stored);
      return items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
    } catch {
      return [];
    }
  }

  static saveOutfits(outfits: StoredOutfit[]): void {
    localStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits));
  }

  static getOutfits(): StoredOutfit[] {
    const stored = localStorage.getItem(OUTFITS_KEY);
    if (!stored) return [];
    
    try {
      const outfits = JSON.parse(stored);
      return outfits.map((outfit: any) => ({
        ...outfit,
        createdAt: new Date(outfit.createdAt)
      }));
    } catch {
      return [];
    }
  }

  static clearAll(): void {
    localStorage.removeItem(WARDROBE_ITEMS_KEY);
    localStorage.removeItem(OUTFITS_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }

  static exportData(): string {
    const data = {
      wardrobeItems: this.getWardrobeItems(),
      outfits: this.getOutfits(),
      userId: this.getUserId()
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.wardrobeItems) this.saveWardrobeItems(data.wardrobeItems);
      if (data.outfits) this.saveOutfits(data.outfits);
      if (data.userId) this.setUserId(data.userId);
      return true;
    } catch {
      return false;
    }
  }
}
