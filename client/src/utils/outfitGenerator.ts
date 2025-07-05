
// Outfit generation utilities
export interface OutfitItem {
  id: number;
  name: string;
  category: string;
  color: string;
  season: string;
  occasion: string;
  imageUrl?: string;
}

export interface OutfitRecommendation {
  id: string;
  name: string;
  items: OutfitItem[];
  occasion: string;
  temperature: string;
  reasoning: string;
  spotlightItem?: OutfitItem;
}

export interface OutfitCandidate {
  items: OutfitItem[];
  spotlightItem: OutfitItem;
}

export interface GenerationOptions {
  maxOutfits?: number;
  occasion?: string;
  temperature?: string;
  allowPartialOutfits?: boolean;
  prioritizeUnworn?: boolean;
  userPreferences?: {
    favoriteColors?: string[];
    preferredStyles?: string[];
  };
}

export class OutfitGenerator {
  private items: OutfitItem[];

  constructor(items: OutfitItem[]) {
    this.items = items;
  }

  private getAccessoryType(accessory: OutfitItem): string {
    const name = accessory.name.toLowerCase();
    const category = accessory.category.toLowerCase();
    
    if (name.includes('earring') || name.includes('ear')) return 'earrings';
    if (name.includes('necklace') || name.includes('chain') || name.includes('pendant')) return 'necklace';
    if (name.includes('bracelet') || name.includes('watch')) return 'bracelet';
    if (name.includes('ring')) return 'ring';
    if (name.includes('bag') || name.includes('purse') || name.includes('tote')) return 'bag';
    if (name.includes('scarf') || name.includes('bandana')) return 'scarf';
    if (name.includes('hat') || name.includes('cap') || name.includes('headband')) return 'headwear';
    if (name.includes('belt')) return 'belt';
    if (name.includes('sunglasses') || name.includes('glasses')) return 'eyewear';
    
    return category || 'accessory';
  }

  generateOutfits(options: GenerationOptions = {}): OutfitCandidate[] {
    const {
      maxOutfits = 6,
      occasion = 'casual',
      temperature = 'mild',
      allowPartialOutfits = true
    } = options;

    const candidates: OutfitCandidate[] = [];

    // Group items by category (support both singular and plural forms)
    const itemsByCategory = this.items.reduce((acc, item) => {
      const category = item.category.toLowerCase();
      // Normalize category names
      let normalizedCategory = category;
      if (category.includes('top') || category === 'blouse' || category === 'shirt' || category === 'sweater') {
        normalizedCategory = 'tops';
      } else if (category.includes('bottom') || category === 'pant' || category === 'skirt' || category === 'jean') {
        normalizedCategory = 'bottoms';
      } else if (category.includes('dress')) {
        normalizedCategory = 'dresses';
      } else if (category.includes('shoe') || category === 'boot' || category === 'sandal') {
        normalizedCategory = 'shoes';
      } else if (category.includes('sock')) {
        normalizedCategory = 'socks';
      } else if (category.includes('accessor') || category === 'bag' || category === 'jewelry' || category === 'scarf' || category === 'hat' || category === 'belt') {
        normalizedCategory = 'accessories';
      }

      if (!acc[normalizedCategory]) {
        acc[normalizedCategory] = [];
      }
      acc[normalizedCategory].push(item);
      return acc;
    }, {} as Record<string, OutfitItem[]>);

    const tops = itemsByCategory['tops'] || [];
    const bottoms = itemsByCategory['bottoms'] || [];
    const dresses = itemsByCategory['dresses'] || [];
    const shoes = itemsByCategory['shoes'] || [];
    const socks = itemsByCategory['socks'] || [];
    const accessories = itemsByCategory['accessories'] || [];

    // Generate dress-based outfits (dress + shoes + optional socks/accessories)
    for (const dress of dresses.slice(0, Math.min(4, dresses.length))) {
      for (const shoe of shoes.slice(0, Math.min(3, shoes.length))) {
        const outfitItems = [dress, shoe];
        
        // Add socks if available (especially good with boots/closed shoes)
        if (socks.length > 0 && (shoe.name.toLowerCase().includes('boot') || shoe.name.toLowerCase().includes('shoe'))) {
          outfitItems.push(socks[Math.floor(Math.random() * socks.length)]);
        }
        
        // Add multiple accessories for complete looks (jewelry, bags, scarves, etc.)
        if (accessories.length > 0) {
          const accessoryTypes = new Set();
          const shuffledAccessories = [...accessories].sort(() => Math.random() - 0.5);
          
          for (const accessory of shuffledAccessories) {
            const accessoryType = this.getAccessoryType(accessory);
            // Allow multiple accessories of different types, up to 4 accessories
            if (!accessoryTypes.has(accessoryType) && outfitItems.length < 8) {
              outfitItems.push(accessory);
              accessoryTypes.add(accessoryType);
            }
          }
        }

        candidates.push({
          items: outfitItems,
          spotlightItem: dress
        });
      }
    }

    // Generate separates-based outfits (top + bottom + shoes + optional socks/accessories)
    for (let i = 0; i < Math.min(4, tops.length); i++) {
      for (let j = 0; j < Math.min(3, bottoms.length); j++) {
        for (let k = 0; k < Math.min(2, shoes.length); k++) {
          const outfitItems = [tops[i], bottoms[j], shoes[k]];
          
          // Add socks if available and appropriate (not just boots)
          if (socks.length > 0 && (shoes[k].name.toLowerCase().includes('boot') || 
              shoes[k].name.toLowerCase().includes('shoe') || 
              shoes[k].name.toLowerCase().includes('sneaker'))) {
            outfitItems.push(socks[Math.floor(Math.random() * socks.length)]);
          }
          
          // Add multiple accessories for complete looks
          if (accessories.length > 0) {
            const accessoryTypes = new Set();
            const shuffledAccessories = [...accessories].sort(() => Math.random() - 0.5);
            
            for (const accessory of shuffledAccessories) {
              const accessoryType = this.getAccessoryType(accessory);
              // Allow multiple accessories of different types, up to 5 accessories
              if (!accessoryTypes.has(accessoryType) && outfitItems.length < 8) {
                outfitItems.push(accessory);
                accessoryTypes.add(accessoryType);
              }
            }
          }

          candidates.push({
            items: outfitItems,
            spotlightItem: tops[i]
          });
        }
      }
    }

    // Remove duplicate outfits (same combination of item IDs)
    const uniqueCandidates = candidates.filter((candidate, index, self) => {
      const signature = candidate.items.map(item => item.id).sort().join(',');
      return index === self.findIndex(c => 
        c.items.map(item => item.id).sort().join(',') === signature
      );
    });

    return uniqueCandidates.slice(0, maxOutfits);
  }
}

export function generateOutfitRecommendations(
  items: OutfitItem[],
  occasion: string = 'casual',
  temperature: string = 'mild'
): OutfitRecommendation[] {
  const generator = new OutfitGenerator(items);
  const candidates = generator.generateOutfits({
    maxOutfits: 6,
    occasion,
    temperature,
    allowPartialOutfits: true
  });

  return candidates.map((candidate, index) => ({
    id: `outfit-${index}`,
    name: `${candidate.spotlightItem.name} Look`,
    items: candidate.items,
    occasion,
    temperature,
    reasoning: `A ${candidate.items.length}-piece outfit featuring ${candidate.spotlightItem.name} as the spotlight piece, ${candidate.items.length > 4 ? 'complete with carefully selected accessories including jewelry, bags, and other styling elements' : 'styled for comfort and elegance'}.`,
    spotlightItem: candidate.spotlightItem
  }));
}

export function getColorHarmony(color: string): string[] {
  // Basic color harmony suggestions
  const colorMap: Record<string, string[]> = {
    'black': ['white', 'gray', 'red', 'blue'],
    'white': ['black', 'blue', 'gray', 'pink'],
    'blue': ['white', 'black', 'gray', 'brown'],
    'red': ['black', 'white', 'blue', 'gray'],
    'gray': ['white', 'black', 'blue', 'pink'],
    'brown': ['cream', 'blue', 'white', 'green'],
    'green': ['brown', 'white', 'black', 'blue'],
    'pink': ['white', 'gray', 'black', 'blue']
  };

  return colorMap[color.toLowerCase()] || ['white', 'black', 'gray'];
}
