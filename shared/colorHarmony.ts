// Color harmony and matching system for outfit recommendations

export const CLOTHING_CATEGORIES = {
  TOPS: 'tops',
  BOTTOMS: 'bottoms', 
  DRESSES: 'dresses',
  SHOES: 'shoes',
  SOCKS: 'socks',
  ACCESSORIES: 'accessories'
} as const;

export const SUBCATEGORIES = {
  // Tops
  BLOUSES: 'blouses',
  SHIRTS: 'shirts',
  T_SHIRTS: 't-shirts',
  SWEATERS: 'sweaters',
  VESTS: 'vests',
  TANKS: 'tanks',
  
  // Bottoms
  SKIRTS: 'skirts',
  PANTS: 'pants',
  SHORTS: 'shorts',
  JEANS: 'jeans',
  LEGGINGS: 'leggings',
  
  // Shoes
  HEELS: 'heels',
  FLATS: 'flats',
  SNEAKERS: 'sneakers',
  BOOTS: 'boots',
  SANDALS: 'sandals',
  
  // Accessories
  BAGS: 'bags',
  JEWELRY: 'jewelry',
  SCARVES: 'scarves',
  HATS: 'hats',
  BELTS: 'belts'
} as const;

export const STYLE_TAGS = {
  CASUAL: 'casual',
  FORMAL: 'formal',
  SPORTY: 'sporty',
  ELEGANT: 'elegant',
  BOHEMIAN: 'bohemian',
  VINTAGE: 'vintage',
  MODERN: 'modern',
  MINIMALIST: 'minimalist'
} as const;

export const OCCASIONS = {
  DATE: 'date',
  WORK: 'work',
  PARTY: 'party',
  CASUAL: 'casual',
  FORMAL: 'formal',
  WEEKEND: 'weekend',
  TRAVEL: 'travel',
  SPORTS: 'sports'
} as const;

// Color categories for matching
export const COLOR_FAMILIES = {
  NEUTRALS: ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'brown', 'cream', 'ivory', 'off-white'],
  REDS: ['red', 'burgundy', 'crimson', 'wine', 'cherry', 'maroon'],
  BLUES: ['blue', 'navy', 'royal blue', 'sky blue', 'turquoise', 'teal', 'indigo'],
  GREENS: ['green', 'olive', 'forest green', 'emerald', 'mint', 'sage'],
  YELLOWS: ['yellow', 'gold', 'mustard', 'butter', 'lemon'],
  ORANGES: ['orange', 'coral', 'peach', 'rust', 'terracotta'],
  PURPLES: ['purple', 'violet', 'lavender', 'plum', 'magenta'],
  PINKS: ['pink', 'rose', 'fuchsia', 'blush', 'salmon']
};

// Color wheel complementary pairs
export const COMPLEMENTARY_COLORS: Record<string, string[]> = {
  'red': ['green', 'teal'],
  'green': ['red', 'pink'],
  'blue': ['orange', 'coral'],
  'orange': ['blue', 'navy'],
  'yellow': ['purple', 'violet'],
  'purple': ['yellow', 'gold'],
  'pink': ['green', 'mint'],
  'navy': ['orange', 'coral', 'yellow']
};

// Colors that work well together (analogous)
export const ANALOGOUS_COLORS: Record<string, string[]> = {
  'blue': ['green', 'purple', 'teal'],
  'green': ['blue', 'yellow', 'teal'],
  'red': ['orange', 'pink', 'purple'],
  'orange': ['red', 'yellow', 'coral'],
  'yellow': ['orange', 'green', 'gold'],
  'purple': ['blue', 'red', 'pink'],
  'pink': ['red', 'purple', 'coral']
};

/**
 * Determines if two colors are compatible based on color harmony rules
 */
export function areColorsCompatible(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();
  
  // Same color family is always compatible
  if (c1 === c2) return true;
  
  // Neutrals work with everything
  if (COLOR_FAMILIES.NEUTRALS.includes(c1) || COLOR_FAMILIES.NEUTRALS.includes(c2)) {
    return true;
  }
  
  // Check complementary colors
  if (COMPLEMENTARY_COLORS[c1]?.includes(c2) || COMPLEMENTARY_COLORS[c2]?.includes(c1)) {
    return true;
  }
  
  // Check analogous colors
  if (ANALOGOUS_COLORS[c1]?.includes(c2) || ANALOGOUS_COLORS[c2]?.includes(c1)) {
    return true;
  }
  
  return false;
}

/**
 * Gets the primary color from a color array
 */
export function getPrimaryColor(colors: string[]): string {
  if (colors.length === 0) return 'neutral';
  
  // Return the first non-neutral color, or the first color if all are neutral
  const nonNeutral = colors.find(color => !COLOR_FAMILIES.NEUTRALS.includes(color.toLowerCase()));
  return nonNeutral || colors[0];
}

/**
 * Finds the color family for a given color
 */
export function getColorFamily(color: string): string {
  const lowerColor = color.toLowerCase();
  
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.includes(lowerColor)) {
      return family.toLowerCase();
    }
  }
  
  return 'other';
}

/**
 * Outfit composition rules for different categories
 */
export const OUTFIT_RULES = {
  // Dress-based outfits
  DRESS_OUTFIT: {
    required: [CLOTHING_CATEGORIES.DRESSES, CLOTHING_CATEGORIES.SHOES],
    optional: [CLOTHING_CATEGORIES.ACCESSORIES, CLOTHING_CATEGORIES.SOCKS],
    colorRule: 'complementary_or_neutral'
  },
  
  // Top + Bottom combinations
  SEPARATES_OUTFIT: {
    required: [CLOTHING_CATEGORIES.TOPS, CLOTHING_CATEGORIES.BOTTOMS, CLOTHING_CATEGORIES.SHOES],
    optional: [CLOTHING_CATEGORIES.ACCESSORIES, CLOTHING_CATEGORIES.SOCKS],
    colorRule: 'matching_or_complementary'
  },
  
  // Layered outfits
  LAYERED_OUTFIT: {
    required: [CLOTHING_CATEGORIES.TOPS, CLOTHING_CATEGORIES.BOTTOMS, CLOTHING_CATEGORIES.SHOES],
    optional: [CLOTHING_CATEGORIES.ACCESSORIES, CLOTHING_CATEGORIES.SOCKS],
    layering: true,
    colorRule: 'neutral_base_with_accent'
  }
};

/**
 * Temperature-based styling recommendations
 */
export const TEMPERATURE_STYLING = {
  WARM: { // >25°C
    preferred: ['light fabrics', 'breathable materials', 'sleeveless', 'shorts', 'sandals'],
    avoid: ['heavy layers', 'dark colors', 'thick fabrics'],
    accessories: ['sun hats', 'lightweight scarves', 'sunglasses']
  },
  
  MILD: { // 15-25°C
    preferred: ['layerable pieces', 'light jackets', 'cardigans', 'long pants'],
    avoid: ['heavy coats', 'thick sweaters'],
    accessories: ['light scarves', 'crossbody bags']
  },
  
  COOL: { // 5-15°C
    preferred: ['sweaters', 'medium jackets', 'warm accessories', 'boots'],
    avoid: ['sleeveless tops', 'sandals'],
    accessories: ['scarves', 'hats', 'warm bags']
  },
  
  COLD: { // <5°C
    preferred: ['heavy coats', 'warm layers', 'boots', 'thick fabrics'],
    avoid: ['light fabrics', 'open shoes'],
    accessories: ['winter hats', 'thick scarves', 'gloves']
  }
};