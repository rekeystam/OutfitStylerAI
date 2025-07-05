The code is modified to include local storage functionality, reset functionality, and integration with React Query for managing wardrobe data, as well as updated dependencies.
```

```replit_final_file
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { WardrobeItem, InsertWardrobeItem } from '@shared/schema';
import { LocalStorageManager } from "@/lib/localStorage";
import { useLocalStorageWardrobe } from "@/hooks/useLocalStorage";

// --- TYPES ---
interface OutfitRecommendation {
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

interface AnalyzedItem {
  name: string;
  category: string;
  subcategory?: string;
  colors: string[];
  primaryColor?: string;
  secondaryColor?: string;
  styleTags: string[];
  occasions: string[];
  versatility: string;
  layerable: boolean;
  style: string;
}

// --- ICONS ---
const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.5 17.5l-1.5 1.5M18.5 5.5l1.5-1.5M12 2v2M12 20v2M4.5 12H2m20 0h-2.5m-5-5l1.5-1.5M5.5 18.5l1.5-1.5m12 .5l-1.5-1.5" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// --- AI SERVICE ---
const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || 
         import.meta.env.VITE_API_KEY || 
         import.meta.env.VITE_GOOGLE_API_KEY || 
         "";
};

const apiKey = getApiKey();
if (!apiKey) {
    console.error("GEMINI API_KEY environment variable not set. Please set VITE_GEMINI_API_KEY, VITE_API_KEY, or VITE_GOOGLE_API_KEY");
}

const ai = new GoogleGenAI({ apiKey });

const ANALYZE_ITEM_PROMPT = `Analyze this clothing item image and provide the following information in JSON format:
    {
      "name": "specific item name (e.g., 'Navy Blue Cotton T-Shirt')",
      "category": "main category: tops, bottoms, dresses, shoes, socks, accessories",
      "subcategory": "specific type: blouses, shirts, t-shirts, sweaters, vests, tanks, skirts, pants, shorts, jeans, leggings, heels, flats, sneakers, boots, sandals, bags, jewelry, scarves, hats, belts",
      "colors": ["array", "of", "color", "names"],
      "primaryColor": "main dominant color",
      "secondaryColor": "accent or secondary color (if any)",
      "styleTags": ["style", "descriptors", "like", "casual", "formal", "sporty", "elegant", "bohemian", "vintage", "modern", "minimalist"],
      "occasions": ["suitable", "occasions"],
      "versatility": "description of how versatile this item is",
      "layerable": true/false,
      "style": "detailed style description including material, cut, design details"
    }

    CATEGORIZATION RULES:
    - Use exact category names: tops, bottoms, dresses, shoes, socks, accessories
    - For subcategories, be specific: shirts (button-up), t-shirts (casual tees), blouses (dressy tops), etc.
    - Primary color should be the most dominant color, secondary is accent/trim color
    - Style tags should include 2-4 descriptors from: casual, formal, sporty, elegant, bohemian, vintage, modern, minimalist
    - Occasions from: date, work, party, casual, formal, weekend, sports, travel
    - Layerable means can be worn with other pieces (cardigans, vests, jackets = true, dresses = false)
    - Focus on female clothing for now`;

const OUTFIT_PROMPT = `You are a professional fashion stylist specializing in female fashion. Generate outfits following these enhanced requirements:

CATEGORY-BASED OUTFIT RULES:
- DRESS OUTFITS: Dress + shoes + optional accessories/socks. Match shoes with complementary or neutral colors.
- SEPARATES OUTFITS: Top + bottom + shoes + optional accessories/socks. Colors should match (same family) or complement (opposite on color wheel).
- LAYERED OUTFITS: Multiple tops or add vests/cardigans for depth. Use neutral base with accent colors.

COLOR HARMONY RULES:
- NEUTRALS (black, white, gray, beige, tan, brown, cream): Work with ANY color
- COMPLEMENTARY PAIRS: Red/green, blue/orange, yellow/purple, pink/green, navy/orange
- ANALOGOUS COLORS: Blue/green/purple, red/orange/pink, yellow/orange/green
- SOCKS: Usually neutral or matching shoes
- ACCESSORIES: Can be neutral or accent color for pop

ENHANCED CATEGORIZATION:
- Tops: blouses, shirts, t-shirts, sweaters, vests, tanks
- Bottoms: skirts, pants, shorts, jeans, leggings  
- Shoes: heels, flats, sneakers, boots, sandals
- Accessories: bags, jewelry, scarves, hats, belts
- Socks: always optional but recommended for boots/closed shoes

STYLING REQUIREMENTS:
- Identify ONE spotlight item (the star piece that defines the outfit)
- Provide specific color coordination advice
- Include layering tips for versatile pieces
- Suggest alternative pieces for different looks
- Focus on female fashion sensibilities

TEMPERATURE STYLING:
- Warm (>25°C): Light fabrics, breathable materials, sandals, sleeveless tops
- Mild (15-25°C): Layerable pieces, light jackets, versatile shoes
- Cool (5-15°C): Sweaters, medium jackets, boots, warm accessories
- Cold (<5°C): Heavy coats, warm layers, winter boots, thick accessories

Respond with JSON: {"outfits": [{"name": "creative outfit name", "occasion": "occasion from: date, work, party, casual, formal, weekend, sports, travel", "temperature": "temperature range", "items": ["item name 1", "item name 2"], "spotlightItem": "name of the star piece", "reasoning": "why these items work together using color harmony rules", "styling": {"description": "detailed styling description", "colorTips": "specific color coordination advice", "sizingTips": "fit and sizing recommendations", "alternatives": ["alternative piece 1", "alternative piece 2"]}}]}

Temperature ranges: warm, mild, cool, cold
Occasions: casual, work, formal, party, date, weekend, travel, seasonal`;

async function analyzeClothingItem(photo: string): Promise<AnalyzedItem> {
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: photo.split(',')[1],
        },
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: ANALYZE_ITEM_PROMPT }, imagePart] },
            config: {
                responseMimeType: "application/json",
            },
        });

        let jsonStr = response.text?.trim() || "";
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const parsedData = JSON.parse(jsonStr);
        return {
            name: parsedData.name,
            category: parsedData.category,
            subcategory: parsedData.subcategory,
            colors: parsedData.colors,
            primaryColor: parsedData.primaryColor,
            secondaryColor: parsedData.secondaryColor,
            styleTags: parsedData.styleTags || [],
            occasions: parsedData.occasions || [],
            versatility: parsedData.versatility || "",
            layerable: parsedData.layerable || false,
            style: parsedData.style || ""
        } as AnalyzedItem;

    } catch (error) {
        console.error("Error analyzing item:", error);
        throw new Error("Failed to analyze clothing item. Please try again.");
    }
}

async function generateOutfitRecommendations(wardrobeItems: WardrobeItem[], occasion?: string, temperature?: string): Promise<OutfitRecommendation[]> {
    if (wardrobeItems.length === 0) {
        return [];
    }

    // Use advanced local generator for better performance and control
    const generator = new (await import('./utils/outfitGenerator')).OutfitGenerator(wardrobeItems);

    const outfitCandidates = generator.generateOutfits({
        maxOutfits: 6,
        occasion,
        temperature,
        allowPartialOutfits: true,
        prioritizeUnworn: true,
        userPreferences: {
            favoriteColors: [], // Could be user-configurable
            preferredStyles: ['casual', 'elegant']
        }
    });

    // Convert candidates to full recommendations with AI-generated styling details
    const recommendations: OutfitRecommendation[] = [];

    for (const candidate of outfitCandidates.slice(0, 4)) {
        try {
            const stylingDetails = await generateStylingDetails(candidate, occasion, temperature);

            recommendations.push({
                name: stylingDetails.name || `${candidate.spotlightItem.name} Look`,
                items: candidate.items,
                occasion: occasion || 'casual',
                temperature: temperature || 'mild',
                reasoning: stylingDetails.reasoning || `This outfit combines ${candidate.items.length} pieces with excellent color harmony, featuring ${candidate.spotlightItem.name} as the spotlight piece.`,
                spotlightItem: candidate.spotlightItem,
                styling: stylingDetails.styling || {
                    description: `A ${candidate.items.length}-piece ensemble that balances comfort and style`,
                    colorTips: `The ${candidate.spotlightItem.primaryColor || candidate.spotlightItem.colors[0]} tones create a cohesive look`,
                    sizingTips: "Ensure proper fit for a polished appearance",
                    alternatives: candidate.items.slice(1).map(item => item.name)
                }
            });
        } catch (error) {
            console.error("Error generating styling details for outfit:", error);
            // Fallback to basic recommendation
            recommendations.push({
                name: `${candidate.spotlightItem.name} Look`,
                items: candidate.items,
                occasion: occasion || 'casual',
                temperature: temperature || 'mild',
                reasoning: `This outfit features ${candidate.items.length} carefully matched pieces with ${candidate.spotlightItem.name} as the centerpiece.`,
                spotlightItem: candidate.spotlightItem,
                styling: {
                    description: `A stylish ${candidate.items.length}-piece combination`,
                    colorTips: `Colors work harmoniously together`,
                    sizingTips: "Ensure comfortable fit",
                    alternatives: []
                }
            });
        }
    }

    return recommendations;
}

// Helper function to generate AI styling details for specific outfits
async function generateStylingDetails(candidate: any, occasion?: string, temperature?: string) {
    const itemsList = candidate.items.map((item: WardrobeItem) => 
        `${item.name} (${item.category}, ${item.colors.join('/')}, ${item.styleTags?.join('/') || 'casual'})`
    ).join(', ');

    const stylingPrompt = `Create styling details for this specific outfit combination:
Items: ${itemsList}
Spotlight piece: ${candidate.spotlightItem.name}
Occasion: ${occasion || 'casual'}
Temperature: ${temperature || 'mild'}

Respond with JSON:
{
  "name": "creative outfit name (3-4 words)",
  "reasoning": "why these specific items work together (focus on colors, textures, style harmony)",
  "styling": {
    "description": "detailed styling approach for this combination",
    "colorTips": "specific color coordination advice for these pieces",
    "sizingTips": "fit recommendations for this outfit",
    "alternatives": ["alternative suggestions for similar looks"]
  }
}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: stylingPrompt }] },
            config: {
                responseMimeType: "application/json",
            },
        });

        const jsonStr = response.text?.trim() || "";
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating styling details:", error);
        return null;
    }
}

// Utility functions

// Simple hash function for photo data
const hashPhoto = async (base64Photo: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64Photo);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="bg-white shadow-md w-full max-w-md mx-auto">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-8 h-8 text-indigo-500" />
          <h1 className="text-xl font-bold text-gray-800">AI Outfit Recommender</h1>
        </div>
        <button onClick={onReset} className="text-sm text-gray-500 hover:text-indigo-600">
          Start Over
        </button>
      </div>
    </header>
  );
};

const DuplicateDetectionDialog: React.FC<{
  duplicates: WardrobeItem[];
  pendingItem: InsertWardrobeItem;
  onAddAnyway: () => void;
  onCancel: () => void;
}> = ({ duplicates, pendingItem, onAddAnyway, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Potential Duplicate Detected</h3>
        <p className="text-sm text-gray-600 mt-1">
          We found {duplicates.length} similar item{duplicates.length > 1 ? 's' : ''} in your wardrobe:
        </p>
      </div>

      <div className="p-4 space-y-3">
        {duplicates.map((duplicate) => (
          <div key={duplicate.id} className="flex space-x-3 p-2 bg-gray-50 rounded">
            <img 
              src={duplicate.image} 
              alt={duplicate.name}
              className="w-12 h-12 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{duplicate.name}</p>
              <p className="text-xs text-gray-500">{duplicate.category}</p>
              <p className="text-xs text-gray-500">Colors: {duplicate.colors.join(', ')}</p>
              {duplicate.style && (
                <p className="text-xs text-gray-500">Style: {duplicate.style}</p>
              )}
            </div>
          </div>
        ))}

        <div className="mt-4 p-2 bg-blue-50 rounded">
          <p className="text-sm font-medium text-blue-800">New Item:</p>
          <p className="text-sm text-blue-700">{pendingItem.name}</p>
          <p className="text-xs text-blue-600">{pendingItem.category} - {pendingItem.colors.join(', ')}</p>
          {pendingItem.style && (
            <p className="text-xs text-blue-600">Style: {pendingItem.style}</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onAddAnyway}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add Anyway
        </button>
      </div>
    </div>
  </div>
);

interface CameraViewProps {
  onTakePhoto: (photo: string) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onTakePhoto, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCameraStream = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera not supported in this browser or environment.");
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" },
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError(null);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access the camera. Please check permissions and try again.");
      }
    };

    getCameraStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleTakePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onTakePhoto(dataUrl);
      }
    }
  }, [onTakePhoto]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {error && <p className="text-white p-4 bg-red-500 rounded-md absolute top-4">{error}</p>}
      <div className="relative w-full h-full">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-around items-center">
        <button
          onClick={onClose}
          className="text-white text-sm font-semibold py-2 px-4 rounded-lg"
        >
          Close
        </button>
        <button
          onClick={handleTakePhoto}
          className="bg-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Take Photo"
        >
          <CameraIcon className="w-8 h-8 text-indigo-600" />
        </button>
      </div>
    </div>
  );
};

interface WardrobeItemCardProps {
  item: WardrobeItem;
  onDelete: (id: number) => void;
  onWear: (id: number, wearCount?: number) => void;
}

const WardrobeItemCard: React.FC<WardrobeItemCardProps> = ({ item, onDelete, onWear }) => {
  const [selectedWearCount, setSelectedWearCount] = useState(item.wearCount);

  const handleWearCountChange = (newCount: number) => {
    setSelectedWearCount(newCount);
    onWear(item.id, newCount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img 
        src={item.image} 
        alt={item.name}
        className="w-full h-32 object-cover"
      />
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-800 mb-1">{item.name}</h3>
        <p className="text-xs text-gray-600 mb-1 capitalize">
          {item.category}{item.subcategory ? ` • ${item.subcategory}` : ''}
        </p>

        {/* Enhanced color display */}
        <div className="flex flex-wrap gap-1 mb-2">
          {item.primaryColor && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {item.primaryColor}
            </span>
          )}
          {item.secondaryColor && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {item.secondaryColor}
            </span>
          )}
          {item.colors.filter(color => color !== item.primaryColor && color !== item.secondaryColor).slice(0, 2).map((color, index) => (
            <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {color}
            </span>
          ))}
        </div>

        {/* Style tags */}
        {item.styleTags && item.styleTags.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {item.styleTags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full capitalize">
                  {tag}
                </span>
              ))}
              {item.layerable && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  Layerable
                </span>
              )}
            </div>
          </div>
        )}
        {item.occasions && item.occasions.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">Perfect for:</p>
            <div className="flex flex-wrap gap-1">
              {item.occasions.map((occasion, index) => (
                <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                  {occasion}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-1">Worn {selectedWearCount} times</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600">Mark as worn:</span>
            <select
              value={selectedWearCount}
              onChange={(e) => handleWearCountChange(parseInt(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
            >
              {[0, 1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count} times
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-red-600 hover:text-red-800"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface OutfitCardProps {
  outfit: OutfitRecommendation;
  onWearOutfit: (items: WardrobeItem[]) => void;
}

const OutfitCard: React.FC<OutfitCardProps> = ({ outfit, onWearOutfit }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getTemperatureColor = (temp: string) => {
    if (!temp) return 'bg-gray-100 text-gray-800';
    switch (temp.toLowerCase()) {
      case 'warm': return 'bg-orange-100 text-orange-800';
      case 'mild': return 'bg-green-100 text-green-800';
      case 'cool': return 'bg-blue-100 text-blue-800';
      case 'cold': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemperatureIcon = (temp: string) => {
    if (!temp) return '🌡️';
    switch (temp.toLowerCase()) {
      case 'warm': return '☀️';
      case 'mild': return '🌤️';
      case 'cool': return '🌥️';
      case 'cold': return '❄️';
      default: return '🌡️';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800 mb-1">{outfit.name}</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full capitalize">
              {outfit.occasion}
            </span>
            <span className={`text-sm px-2 py-1 rounded-full capitalize ${getTemperatureColor(outfit.temperature)}`}>
              {getTemperatureIcon(outfit.temperature)} {outfit.temperature}
            </span>
            {outfit.spotlightItem && (
              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                ⭐ Spotlight: {outfit.spotlightItem.name}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 italic mb-3">{outfit.reasoning}</p>
        </div>
        <div className="flex flex-col space-y-2 ml-3">
          <button
            onClick={() => onWearOutfit(outfit.items)}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Wear This
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200"
          >
            {showDetails ? 'Hide Details' : 'Styling Tips'}
          </button>
        </div>
      </div>

      {showDetails && outfit.styling && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Styling Guide</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <strong>Description:</strong> {outfit.styling.description}
            </div>
            <div>
              <strong>Color Tips:</strong> {outfit.styling.colorTips}
            </div>
            <div>
              <strong>Sizing Tips:</strong> {outfit.styling.sizingTips}
            </div>
            {outfit.styling.alternatives && outfit.styling.alternatives.length > 0 && (
              <div>
                <strong>Alternatives:</strong> {outfit.styling.alternatives.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Items ({outfit.items.length}):
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {outfit.items.map((item, index) => (
            <div key={index} className="text-center relative">
              {outfit.spotlightItem && outfit.spotlightItem.id === item.id && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  ⭐
                </div>
              )}
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-20 object-cover rounded-lg mb-1 border"
              />
              <p className="text-xs text-gray-600 truncate font-medium">{item.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {item.category}{item.subcategory ? `/${item.subcategory}` : ''}
              </p>
              <div className="flex flex-wrap gap-1 mt-1 justify-center">
                {item.primaryColor && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded font-medium">
                    {item.primaryColor}
                  </span>
                )}
                {item.colors.slice(0, 1).map((color, colorIndex) => (
                  color !== item.primaryColor && (
                    <span key={colorIndex} className="text-xs bg-gray-200 text-gray-600 px-1 rounded">
                      {color}
                    </span>
                  )
                ))}
              </div>
              {item.styleTags && item.styleTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 justify-center">
                  {item.styleTags.slice(0, 2).map((tag, tagIndex) => (
                    <span key={tagIndex} className="text-xs bg-green-100 text-green-700 px-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
enum AppState {
  Welcome,
  Wardrobe,
  AddingItem,
  Outfits,
  Loading,
  Error,
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Welcome);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outfitRecommendations, setOutfitRecommendations] = useState<OutfitRecommendation[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const [showDuplicateDialog, setShowDuplicateDialog] = useState<boolean>(false);
  const [duplicateItems, setDuplicateItems] = useState<WardrobeItem[]>([]);
  const [pendingItem, setPendingItem] = useState<InsertWardrobeItem | null>(null);

  const userId = 1; // Mock user ID for demo
  const queryClient = useQueryClient();
    const { toast } = useToast()

  // Clear errors when state changes
  useEffect(() => {
    if (appState !== AppState.Error) {
      setError(null);
    }
  }, [appState]);

  // Query wardrobe items
  const { data: wardrobeItems = [], isLoading: isLoadingWardrobe } = useQuery({
    queryKey: ['/api/wardrobe-items', userId],
    queryFn: () => apiRequest(`/api/wardrobe-items/${userId}`),
  });

  // Add wardrobe item mutation
  const addItemMutation = useMutation({
    mutationFn: (item: InsertWardrobeItem) => 
      apiRequest('/api/wardrobe-items', 'POST', item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wardrobe-items', userId] });
      setAppState(AppState.Wardrobe);
      setIsAnalyzing(false);
      setShowDuplicateDialog(false);
      setPendingItem(null);
      setDuplicateItems([]);
    },
    onError: (error) => {
      console.error('Error adding item:', error);
      setError('Failed to add item to wardrobe');
      setIsAnalyzing(false);
      setShowDuplicateDialog(false);
      setPendingItem(null);
      setDuplicateItems([]);
    }
  });

  // Update item mutation (for wear count)
  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<WardrobeItem> }) => 
      apiRequest(`/api/wardrobe-items/${id}`, 'PATCH', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wardrobe-items', userId] });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/wardrobe-items/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wardrobe-items', userId] });
    }
  });

  // Local storage integration
  const localStorage = useLocalStorageWardrobe();

  // Sync server data with localStorage on app load
  useEffect(() => {
    if (wardrobeItems && localStorage.isLoaded) {
      // Save server items to localStorage
      const itemsToStore = wardrobeItems.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
      LocalStorageManager.saveWardrobeItems(itemsToStore);
    }
  }, [wardrobeItems, localStorage.isLoaded]);

  const handleTakePhoto = async (photo: string) => {
    setIsCameraOpen(false);
    setIsAnalyzing(true);
    setAppState(AppState.AddingItem);

    try {
      const analyzedItem = await analyzeClothingItem(photo);
      const photoHash = await hashPhoto(photo);

      const wardrobeItem: InsertWardrobeItem = {
        userId,
        name: analyzedItem.name,
        category: analyzedItem.category,
        subcategory: analyzedItem.subcategory,
        colors: analyzedItem.colors,
        primaryColor: analyzedItem.primaryColor,
        secondaryColor: analyzedItem.secondaryColor,
        image: photo,
        photoHash,
        style: analyzedItem.style,
        styleTags: analyzedItem.styleTags || [],
        wearCount: 0,
        occasions: analyzedItem.occasions || [],
        gender: "female",
        layerable: analyzedItem.layerable || false,
        versatility: analyzedItem.versatility,
      };

      // Check for duplicates first
      const duplicateResponse = await apiRequest('/api/wardrobe-items/check-duplicates', 'POST', wardrobeItem);

      if (duplicateResponse.duplicates && duplicateResponse.duplicates.length > 0) {
        setDuplicateItems(duplicateResponse.duplicates);
        setPendingItem(wardrobeItem);
        setShowDuplicateDialog(true);
        setIsAnalyzing(false);
      } else {
        addItemMutation.mutate(wardrobeItem);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze item');
      setIsAnalyzing(false);
      setAppState(AppState.Error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 10);

      if (imageFiles.length === 0) {
        setError('Please select valid image files');
        return;
      }

      if (files.length > 10) {
        setError('Maximum 10 photos allowed. Only the first 10 will be processed.');
      }

      setAppState(AppState.AddingItem);
      setIsAnalyzing(true);

      for (const file of imageFiles) {
        try {
          const reader = new FileReader();
          const photoPromise = new Promise<string>((resolve) => {
            reader.onload = (e) => {
              const result = e.target?.result;
              if (result) {
                resolve(result as string);
              }
            };
          });

          reader.readAsDataURL(file);
          const photo = await photoPromise;

          const analyzedItem = await analyzeClothingItem(photo);
          const photoHash = await hashPhoto(photo);

          const wardrobeItem: InsertWardrobeItem = {
            userId,
            name: analyzedItem.name,
            category: analyzedItem.category,
            colors: analyzedItem.colors,
            image: photo,
            photoHash,
            style: analyzedItem.style,
            wearCount: 0,
            occasions: analyzedItem.occasions || [],
          };

          const duplicateResponse = await apiRequest('/api/wardrobe-items/check-duplicates', 'POST', wardrobeItem);

          if (duplicateResponse.duplicates && duplicateResponse.duplicates.length > 0) {
            setDuplicateItems(duplicateResponse.duplicates);
            setPendingItem(wardrobeItem);
            setShowDuplicateDialog(true);
            setIsAnalyzing(false);
          } else {

            await new Promise<void>((resolve, reject) => {
              addItemMutation.mutate(wardrobeItem, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
              });
            });
          }
        } catch (error) {
          console.error('Error processing file:', file.name, error);
        }
      }

      setIsAnalyzing(false);
      setAppState(AppState.Wardrobe);
    }
    event.target.value = '';
  };

  const handleDeleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  const handleWearItem = (id: number, wearCount?: number) => {
    const item = wardrobeItems.find((item: WardrobeItem) => item.id === id);
    if (item) {
      const newWearCount = wearCount !== undefined ? wearCount : item.wearCount + 1;
      updateItemMutation.mutate({
        id,
        updates: { wearCount: newWearCount }
      });
    }
  };

  const handleWearOutfit = (items: WardrobeItem[]) => {
    items.forEach(item => {
      updateItemMutation.mutate({
        id: item.id,
        updates: { wearCount: item.wearCount + 1 }
      });
    });
  };

  const handleGenerateOutfits = async (occasion?: string, temperature?: string) => {
    if (wardrobeItems.length < 2) {
      setError('Add at least 2 items to your wardrobe to generate outfit recommendations');
      return;
    }

    setAppState(AppState.Loading);
    try {
      const recommendations = await generateOutfitRecommendations(wardrobeItems, occasion, temperature);
      setOutfitRecommendations(recommendations);
      setAppState(AppState.Outfits);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate outfits');
      setAppState(AppState.Error);
    }
  };

  const handleAddDuplicateAnyway = () => {
    if (pendingItem) {
      addItemMutation.mutate(pendingItem);
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setPendingItem(null);
    setDuplicateItems([]);
    setIsAnalyzing(false);
    setAppState(AppState.Wardrobe);
  };

  const resetApp = () => {
    setPhotos([]);
    setRecommendations([]);
    setError(null);
    setIsCameraOpen(false);
    setAppState(AppState.Welcome);
  };

  const clearAllData = () => {
    // Clear localStorage
    LocalStorageManager.clearAll();
    localStorage.clearAll();

    // Clear React Query cache
    queryClient.clear();

    // Show success message
    toast({
      title: "Data Cleared",
      description: "All wardrobe items and outfits have been cleared from local storage.",
    });

    // Restart the app state
    setAppState(AppState.Welcome);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.Welcome:
        return (
          <div className="flex flex-col items-center justify-center min-h-96 p-8 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                <SparklesIcon className="w-16 h-16 text-indigo-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Your AI Wardrobe</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Build your digital wardrobe and get personalized outfit recommendations for any occasion!
            </p>
            <button 
              onClick={() => setAppState(AppState.Wardrobe)}
              className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors duration-300 shadow-lg"
            >
              Get Started
            </button>
          </div>
        );

      case AppState.Wardrobe:
        return (
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Wardrobe</h2>
              <div className="flex space-x-2">
                {wardrobeItems.length >= 2 && (
                  <div className="flex space-x-2">
                    <select 
                      onChange={(e) => handleGenerateOutfits(e.target.value)}
                      className="text-xs px-2 py-1 border rounded-lg"
                      defaultValue=""
                    >
                      <option value="">All Occasions</option>
                      <option value="casual">Casual</option>
                      <option value="work">Work</option>
                      <option value="formal">Formal</option>
                      <option value="party">Party</option>
                      <option value="date">Date</option>
                      <option value="weekend">Weekend</option>
                    </select>
                    <button
                      onClick={() => handleGenerateOutfits()}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>Get Outfits</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isLoadingWardrobe ? (
              <LoadingSpinner />
            ) : wardrobeItems.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">Your wardrobe is empty. Add some clothing items to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {wardrobeItems.map((item: WardrobeItem) => (
                  <WardrobeItemCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteItem}
                    onWear={handleWearItem}
                  />
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => setIsCameraOpen(true)}
                className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center space-x-2"
              >
                <CameraIcon className="w-5 h-5" />
                <span>Take Photo</span>
              </button>
              <label className="flex-1 bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors duration-300 flex items-center justify-center space-x-2 cursor-pointer">
                <ImageIcon className="w-5 h-5" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        );

      case AppState.AddingItem:
        return (
          <div className="text-center p-10">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              {isAnalyzing ? 'Analyzing your items...' : 'Adding to wardrobe...'}
            </h2>
            <p className="text-gray-500 mb-6">
              {isAnalyzing ? 'AI is identifying clothing items and their details. This may take a moment for multiple photos.' : 'Saving your items to the wardrobe.'}
            </p>
            <LoadingSpinner />
          </div>
        );

      case AppState.Outfits:
        return (
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Outfit Ideas</h2>
              <button
                onClick={() => setAppState(AppState.Wardrobe)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Back to Wardrobe
              </button>
            </div>

            {outfitRecommendations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No outfit recommendations available.</p>
              </div>
            ) : (
              <div>
                {outfitRecommendations.map((outfit, index) => (
                  <OutfitCard
                    key={index}
                    outfit={outfit}
                    onWearOutfit={handleWearOutfit}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case AppState.Loading:
        return (
          <div className="text-center p-10">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Creating outfit ideas...</h2>
            <p className="text-gray-500 mb-6">AI is analyzing your wardrobe and generating recommendations.</p>
            <LoadingSpinner />
          </div>
        );

      case AppState.Error:
        return (
          <div className="text-center p-10 bg-red-50 rounded-lg m-4">
            <h2 className="text-2xl font-semibold text-red-700 mb-4">Oops! Something went wrong.</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setAppState(AppState.Wardrobe);
              }}
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const handleReset = () => {
    setAppState(AppState.Welcome);
    setError(null);
    setOutfitRecommendations([]);
    setIsCameraOpen(false);
    setIsAnalyzing(false);
    setShowDuplicateDialog(false);
    setDuplicateItems([]);
    setPendingItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onReset={handleReset} />
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        {error && appState !== AppState.Error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        {renderContent()}
      </div>
      {isCameraOpen && (
        <CameraView
          onTakePhoto={handleTakePhoto}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
      {showDuplicateDialog && pendingItem && (
        <DuplicateDetectionDialog
          duplicates={duplicateItems}
          pendingItem={pendingItem}
          onAddAnyway={handleAddDuplicateAnyway}
          onCancel={handleCancelDuplicate}
        />
      )}
    </div>
  );
};

export default App;