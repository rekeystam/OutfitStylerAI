
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
          outfitItems.push(socks[0]);
        }
        
        // Add an accessory if available
        if (accessories.length > 0) {
          outfitItems.push(accessories[Math.floor(Math.random() * accessories.length)]);
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
          
          // Add socks if available and appropriate
          if (socks.length > 0 && shoes[k].name.toLowerCase().includes('boot')) {
            outfitItems.push(socks[0]);
          }
          
          // Add accessories if available (1-2 accessories max)
          if (accessories.length > 0) {
            const numAccessories = Math.min(2, accessories.length);
            for (let a = 0; a < numAccessories; a++) {
              if (outfitItems.length < 6) { // Keep outfits reasonable size
                outfitItems.push(accessories[a]);
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
    reasoning: `A ${candidate.items.length}-piece outfit featuring ${candidate.spotlightItem.name} as the spotlight piece, ${candidate.items.length > 3 ? 'complete with accessories' : 'styled for comfort and elegance'}.`,
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
