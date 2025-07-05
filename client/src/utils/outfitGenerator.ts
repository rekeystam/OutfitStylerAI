
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

    // Group items by category
    const itemsByCategory = this.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, OutfitItem[]>);

    // Generate basic outfit combinations
    const tops = itemsByCategory['tops'] || itemsByCategory['top'] || [];
    const bottoms = itemsByCategory['bottoms'] || itemsByCategory['bottom'] || [];
    const dresses = itemsByCategory['dresses'] || itemsByCategory['dress'] || [];
    const shoes = itemsByCategory['shoes'] || [];

    // Generate dress-based outfits
    for (const dress of dresses.slice(0, Math.min(3, dresses.length))) {
      if (shoes.length > 0) {
        candidates.push({
          items: [dress, shoes[0]],
          spotlightItem: dress
        });
      }
    }

    // Generate separates-based outfits
    for (let i = 0; i < Math.min(3, tops.length); i++) {
      for (let j = 0; j < Math.min(2, bottoms.length); j++) {
        if (shoes.length > 0) {
          candidates.push({
            items: [tops[i], bottoms[j], shoes[0]],
            spotlightItem: tops[i]
          });
        }
      }
    }

    return candidates.slice(0, maxOutfits);
  }
}

export function generateOutfitRecommendations(
  items: OutfitItem[],
  occasion: string = 'casual',
  temperature: string = 'mild'
): OutfitRecommendation[] {
  // Basic outfit generation logic
  const recommendations: OutfitRecommendation[] = [];

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, OutfitItem[]>);

  // Generate basic outfit combinations
  const tops = itemsByCategory['top'] || [];
  const bottoms = itemsByCategory['bottom'] || [];
  const shoes = itemsByCategory['shoes'] || [];

  for (let i = 0; i < Math.min(3, tops.length); i++) {
    for (let j = 0; j < Math.min(2, bottoms.length); j++) {
      if (shoes.length > 0) {
        const outfit: OutfitRecommendation = {
          id: `outfit-${i}-${j}`,
          name: `Outfit ${recommendations.length + 1}`,
          items: [tops[i], bottoms[j], shoes[0]],
          occasion,
          temperature,
          reasoning: `A ${occasion} outfit combining ${tops[i].name} with ${bottoms[j].name}`,
          spotlightItem: tops[i]
        };
        recommendations.push(outfit);
      }
    }
  }

  return recommendations;
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
