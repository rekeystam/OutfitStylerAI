import type { WardrobeItem } from '@shared/schema';

export interface OutfitRecommendation {
  name: string;
  items: WardrobeItem[];
  occasion: string;
  temperature: string;
  reasoning: string;
  spotlightItem?: WardrobeItem;
  styling: {
    description: string;
    colorTips: string;
    sizingTips: string;
    alternatives: string[];
  };
}

interface OutfitGeneratorOptions {
  maxOutfits?: number;
  occasion?: string;
  temperature?: string;
  allowPartialOutfits?: boolean;
  prioritizeUnworn?: boolean;
  userPreferences?: {
    favoriteColors?: string[];
    preferredStyles?: string[];
    avoidColors?: string[];
  };
}

interface OutfitCandidate {
  items: WardrobeItem[];
  signature: string;
  score: number;
  spotlightItem: WardrobeItem;
  colorHarmony: boolean;
  categoryBalance: boolean;
}

// Color harmony helper functions
const COLOR_FAMILIES = {
  NEUTRALS: ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'brown', 'cream', 'ivory', 'off-white'],
  REDS: ['red', 'burgundy', 'crimson', 'wine', 'cherry', 'maroon'],
  BLUES: ['blue', 'navy', 'royal blue', 'sky blue', 'turquoise', 'teal', 'indigo'],
  GREENS: ['green', 'olive', 'forest green', 'emerald', 'mint', 'sage'],
  YELLOWS: ['yellow', 'gold', 'mustard', 'butter', 'lemon'],
  ORANGES: ['orange', 'coral', 'peach', 'rust', 'terracotta'],
  PURPLES: ['purple', 'violet', 'lavender', 'plum', 'magenta'],
  PINKS: ['pink', 'rose', 'fuchsia', 'blush', 'salmon']
};

const COMPLEMENTARY_COLORS: Record<string, string[]> = {
  'red': ['green', 'teal'],
  'green': ['red', 'pink'],
  'blue': ['orange', 'coral'],
  'orange': ['blue', 'navy'],
  'yellow': ['purple', 'violet'],
  'purple': ['yellow', 'gold'],
  'pink': ['green', 'mint'],
  'navy': ['orange', 'coral', 'yellow']
};

function areColorsCompatible(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();
  
  if (c1 === c2) return true;
  
  if (COLOR_FAMILIES.NEUTRALS.includes(c1) || COLOR_FAMILIES.NEUTRALS.includes(c2)) {
    return true;
  }
  
  if (COMPLEMENTARY_COLORS[c1]?.includes(c2) || COMPLEMENTARY_COLORS[c2]?.includes(c1)) {
    return true;
  }
  
  return false;
}

/**
 * Advanced outfit generator with uniqueness tracking and performance optimization
 */
export class OutfitGenerator {
  private wardrobeItems: WardrobeItem[];
  private generatedSignatures: Set<string> = new Set();
  private maxCombinations: number = 10000;

  constructor(wardrobeItems: WardrobeItem[]) {
    this.wardrobeItems = wardrobeItems;
  }

  /**
   * Generate unique outfit combinations with advanced matching
   */
  generateOutfits(options: OutfitGeneratorOptions = {}): OutfitCandidate[] {
    const {
      maxOutfits = 4,
      occasion,
      temperature,
      allowPartialOutfits = true,
      prioritizeUnworn = true,
      userPreferences = {}
    } = options;

    const outfits: OutfitCandidate[] = [];
    const itemsByCategory = this.categorizeItems();
    let combinationCount = 0;

    // Filter items by occasion if specified
    const filteredItems = occasion ? 
      this.wardrobeItems.filter(item => item.occasions.includes(occasion)) : 
      this.wardrobeItems;

    // Try dress-based outfits first
    for (const dress of itemsByCategory.dresses) {
      if (combinationCount >= this.maxCombinations) break;
      
      const dressOutfits = this.generateDressOutfits(dress, itemsByCategory, options);
      outfits.push(...dressOutfits);
      combinationCount += dressOutfits.length;
      
      if (outfits.length >= maxOutfits) break;
    }

    // Generate separates outfits
    if (outfits.length < maxOutfits) {
      const separatesOutfits = this.generateSeparatesOutfits(itemsByCategory, options, maxOutfits - outfits.length);
      outfits.push(...separatesOutfits);
    }

    // Score and rank outfits
    const rankedOutfits = this.rankOutfits(outfits, userPreferences, prioritizeUnworn);
    
    return rankedOutfits.slice(0, maxOutfits);
  }

  /**
   * Generate dress-based outfit combinations
   */
  private generateDressOutfits(
    dress: WardrobeItem, 
    itemsByCategory: Record<string, WardrobeItem[]>, 
    options: OutfitGeneratorOptions
  ): OutfitCandidate[] {
    const outfits: OutfitCandidate[] = [];
    const { allowPartialOutfits = true } = options;

    // Essential: dress + shoes
    for (const shoes of itemsByCategory.shoes) {
      const baseItems = [dress, shoes];
      
      // Check color compatibility
      if (!this.areItemsCompatible(dress, shoes)) continue;

      // Add accessories (optional)
      const accessoryOutfits = allowPartialOutfits ? 
        this.addOptionalItems(baseItems, itemsByCategory.accessories, 1) : 
        [baseItems];

      for (const items of accessoryOutfits) {
        // Add socks (optional for closed shoes)
        const finalOutfits = this.shouldAddSocks(shoes) && allowPartialOutfits ?
          this.addOptionalItems(items, itemsByCategory.socks, 1) :
          [items];

        for (const finalItems of finalOutfits) {
          const signature = this.createSignature(finalItems);
          
          if (!this.generatedSignatures.has(signature)) {
            this.generatedSignatures.add(signature);
            
            outfits.push({
              items: finalItems,
              signature,
              score: this.calculateOutfitScore(finalItems),
              spotlightItem: dress,
              colorHarmony: this.checkColorHarmony(finalItems),
              categoryBalance: this.checkCategoryBalance(finalItems)
            });
          }
        }
      }
    }

    return outfits;
  }

  /**
   * Generate separates-based outfit combinations
   */
  private generateSeparatesOutfits(
    itemsByCategory: Record<string, WardrobeItem[]>,
    options: OutfitGeneratorOptions,
    maxOutfits: number
  ): OutfitCandidate[] {
    const outfits: OutfitCandidate[] = [];
    const { allowPartialOutfits = true } = options;

    // Essential: top + bottom + shoes
    for (const top of itemsByCategory.tops) {
      if (outfits.length >= maxOutfits) break;
      
      for (const bottom of itemsByCategory.bottoms) {
        if (outfits.length >= maxOutfits) break;
        
        // Check top-bottom compatibility
        if (!this.areItemsCompatible(top, bottom)) continue;

        for (const shoes of itemsByCategory.shoes) {
          const baseItems = [top, bottom, shoes];
          
          // Check overall color harmony
          if (!this.checkColorHarmony(baseItems)) continue;

          // Determine spotlight item (most interesting/unique piece)
          const spotlightItem = this.selectSpotlightItem(baseItems);

          // Add layering pieces if item is layerable
          const layeredOutfits = this.addLayeringPieces(baseItems, itemsByCategory, allowPartialOutfits);

          for (const items of layeredOutfits) {
            const signature = this.createSignature(items);
            
            if (!this.generatedSignatures.has(signature)) {
              this.generatedSignatures.add(signature);
              
              outfits.push({
                items,
                signature,
                score: this.calculateOutfitScore(items),
                spotlightItem,
                colorHarmony: this.checkColorHarmony(items),
                categoryBalance: this.checkCategoryBalance(items)
              });

              if (outfits.length >= maxOutfits) break;
            }
          }
        }
      }
    }

    return outfits;
  }

  /**
   * Add optional items to outfit combinations
   */
  private addOptionalItems(
    baseItems: WardrobeItem[], 
    optionalItems: WardrobeItem[], 
    maxAdd: number = 1
  ): WardrobeItem[][] {
    const combinations: WardrobeItem[][] = [baseItems];
    
    // Add combinations with optional items
    for (let i = 0; i < Math.min(optionalItems.length, maxAdd); i++) {
      const item = optionalItems[i];
      
      // Check if item is compatible with base items
      if (baseItems.every(baseItem => this.areItemsCompatible(baseItem, item))) {
        combinations.push([...baseItems, item]);
      }
    }

    return combinations;
  }

  /**
   * Add layering pieces for versatile outfits
   */
  private addLayeringPieces(
    baseItems: WardrobeItem[], 
    itemsByCategory: Record<string, WardrobeItem[]>, 
    allowPartialOutfits: boolean
  ): WardrobeItem[][] {
    const combinations: WardrobeItem[][] = [baseItems];
    
    if (!allowPartialOutfits) return combinations;

    // Add vests, cardigans, or layerable tops
    const layerableItems = itemsByCategory.tops.filter(item => 
      item.layerable && !baseItems.includes(item)
    );

    for (const layer of layerableItems.slice(0, 2)) {
      if (this.checkColorHarmony([...baseItems, layer])) {
        combinations.push([...baseItems, layer]);
      }
    }

    return combinations;
  }

  /**
   * Categorize wardrobe items by type
   */
  private categorizeItems(): Record<string, WardrobeItem[]> {
    const categories: Record<string, WardrobeItem[]> = {
      tops: [],
      bottoms: [],
      dresses: [],
      shoes: [],
      socks: [],
      accessories: []
    };

    for (const item of this.wardrobeItems) {
      const category = item.category.toLowerCase();
      if (categories[category]) {
        categories[category].push(item);
      }
    }

    return categories;
  }

  /**
   * Check if two items are compatible (color and style)
   */
  private areItemsCompatible(item1: WardrobeItem, item2: WardrobeItem): boolean {
    for (const color1 of item1.colors) {
      for (const color2 of item2.colors) {
        if (areColorsCompatible(color1, color2)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check overall color harmony of an outfit
   */
  private checkColorHarmony(items: WardrobeItem[]): boolean {
    if (items.length < 2) return true;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (!this.areItemsCompatible(items[i], items[j])) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if outfit has good category balance
   */
  private checkCategoryBalance(items: WardrobeItem[]): boolean {
    const categories = new Set(items.map(item => item.category));
    const accessoryCount = items.filter(item => item.category === 'accessories').length;
    
    return categories.size >= 2 && accessoryCount <= 2;
  }

  /**
   * Select the most interesting item as spotlight
   */
  private selectSpotlightItem(items: WardrobeItem[]): WardrobeItem {
    return items.reduce((spotlight, item) => {
      const itemScore = this.calculateItemInterestScore(item);
      const spotlightScore = this.calculateItemInterestScore(spotlight);
      
      return itemScore > spotlightScore ? item : spotlight;
    });
  }

  /**
   * Calculate how interesting/unique an item is
   */
  private calculateItemInterestScore(item: WardrobeItem): number {
    let score = 0;
    
    score += Math.max(0, 10 - item.wearCount);
    score += item.colors.length * 2;
    
    if (item.styleTags?.includes('formal') || item.styleTags?.includes('elegant')) {
      score += 5;
    }
    
    if (item.category === 'dresses' || item.name.toLowerCase().includes('statement')) {
      score += 3;
    }
    
    return score;
  }

  /**
   * Calculate overall outfit score for ranking
   */
  private calculateOutfitScore(items: WardrobeItem[]): number {
    let score = 0;
    
    if (this.checkColorHarmony(items)) score += 10;
    if (this.checkCategoryBalance(items)) score += 5;
    
    const categories = new Set(items.map(item => item.category));
    score += categories.size * 2;
    
    const avgWearCount = items.reduce((sum, item) => sum + item.wearCount, 0) / items.length;
    score += Math.max(0, 10 - avgWearCount);
    
    return score;
  }

  /**
   * Rank outfits by score and user preferences
   */
  private rankOutfits(
    outfits: OutfitCandidate[], 
    userPreferences: { favoriteColors?: string[]; preferredStyles?: string[]; avoidColors?: string[] },
    prioritizeUnworn: boolean
  ): OutfitCandidate[] {
    return outfits.sort((a, b) => {
      let scoreA = a.score;
      let scoreB = b.score;
      
      if (userPreferences.favoriteColors) {
        const aHasFavorite = a.items.some(item => 
          item.colors.some(color => userPreferences.favoriteColors!.includes(color))
        );
        const bHasFavorite = b.items.some(item => 
          item.colors.some(color => userPreferences.favoriteColors!.includes(color))
        );
        
        if (aHasFavorite) scoreA += 5;
        if (bHasFavorite) scoreB += 5;
      }
      
      if (userPreferences.preferredStyles) {
        const aHasPreferred = a.items.some(item => 
          item.styleTags?.some(tag => userPreferences.preferredStyles!.includes(tag))
        );
        const bHasPreferred = b.items.some(item => 
          item.styleTags?.some(tag => userPreferences.preferredStyles!.includes(tag))
        );
        
        if (aHasPreferred) scoreA += 3;
        if (bHasPreferred) scoreB += 3;
      }
      
      return scoreB - scoreA;
    });
  }

  /**
   * Create unique signature for outfit (sorted item IDs)
   */
  private createSignature(items: WardrobeItem[]): string {
    return items
      .map(item => item.id)
      .sort((a, b) => a - b)
      .join('-');
  }

  /**
   * Check if socks should be added for certain shoe types
   */
  private shouldAddSocks(shoes: WardrobeItem): boolean {
    const shoeType = shoes.subcategory?.toLowerCase() || shoes.name.toLowerCase();
    return shoeType.includes('boot') || shoeType.includes('sneaker') || shoeType.includes('closed');
  }
}