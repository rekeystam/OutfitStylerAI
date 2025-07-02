import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { WardrobeItem, InsertWardrobeItem } from '@shared/schema';

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
  colors: string[];
  occasions: string[];
  versatility: string;
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

const ANALYZE_ITEM_PROMPT = `You are a fashion stylist. Analyze the clothing item in the attached image. Identify the specific clothing item, its category, primary colors, suitable occasions, and versatility. Respond with a JSON object with the following structure: {"name": "item name", "category": "category", "colors": ["color1", "color2"], "occasions": ["occasion1", "occasion2"], "versatility": "description of how versatile this item is"}.

Categories should be one of: shirt, t-shirt, blouse, tank-top, sweater, hoodie, cardigan, jacket, coat, blazer, dress, skirt, pants, jeans, shorts, leggings, shoes, sneakers, boots, sandals, hat, scarf, belt, bag, accessories.

Colors should be basic color names like: black, white, gray, brown, tan, red, pink, orange, yellow, green, blue, navy, purple, denim, gold, silver.

Occasions should include: casual, work, formal, party, date, weekend, travel, seasonal, sport, evening.

Example response: {"name": "Blue Denim Jacket", "category": "jacket", "colors": ["blue", "denim"], "occasions": ["casual", "weekend"], "versatility": "Perfect layering piece that works with dresses, t-shirts, and can be dressed up or down"}`;

const OUTFIT_PROMPT = `You are a professional fashion stylist. Generate outfits following these requirements:

COMPOSITION FLEXIBILITY:
- Outfits can be as simple as 2 items (e.g., dress + shoes) or complex (3+ items)
- For dresses: pair with matching shoes, accessories, or outerwear
- For casual looks: T-shirt + pants + sneakers combinations work well
- Always identify ONE spotlight item per outfit (the star piece)

STYLING DETAILS REQUIRED:
- Provide detailed styling tips for colors, sizing, and alternatives
- Suggest color coordination and contrast techniques
- Include fit and sizing recommendations
- Offer alternative pieces for different looks

OCCASION ADAPTATION:
- Casual: Comfortable, relaxed pieces with sneakers or flats
- Work: Professional, polished looks with blazers or dress shoes
- Formal: Elegant pieces with heels and refined accessories
- Party/Evening: Statement pieces with bold colors or textures
- Date: Flattering, stylish pieces that show personality
- Weekend: Laid-back, versatile pieces for multiple activities

TEMPERATURE SUITABILITY:
- Warm (>25°C): Light fabrics, breathable materials, sun protection
- Mild (15-25°C): Layerable pieces, light jackets
- Cool (5-15°C): Sweaters, medium jackets, warm accessories
- Cold (<5°C): Heavy coats, warm layers, winter accessories

Respond with JSON: {"outfits": [{"name": "creative outfit name", "occasion": "occasion", "temperature": "temperature range", "items": ["item name 1", "item name 2"], "spotlightItem": "name of the star piece", "reasoning": "why these items work together", "styling": {"description": "detailed styling description", "colorTips": "color coordination advice", "sizingTips": "fit and sizing recommendations", "alternatives": ["alternative piece 1", "alternative piece 2"]}}]}

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
            colors: parsedData.colors,
            occasions: parsedData.occasions || [],
            versatility: parsedData.versatility || ""
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

    const itemsDescription = wardrobeItems.map(item => 
        `${item.name} (${item.category}, colors: ${item.colors.join(', ')}, occasions: ${item.occasions.join(', ')}, worn ${item.wearCount} times)`
    ).join('\n');

    let fullPrompt = `${OUTFIT_PROMPT}\n\nWardrobe items:\n${itemsDescription}`;
    
    if (occasion) {
        fullPrompt += `\n\nFOCUS OCCASION: ${occasion} - prioritize outfits suitable for this occasion`;
    }
    
    if (temperature) {
        fullPrompt += `\n\nPREFERRED TEMPERATURE: ${temperature} - focus on outfits for this temperature range`;
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
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

        if (parsedData && Array.isArray(parsedData.outfits)) {
            // Map item names back to actual WardrobeItem objects
            const outfits = parsedData.outfits.map((outfit: any) => {
                const matchedItems = outfit.items.map((itemName: string) => 
                    wardrobeItems.find(item => item.name.toLowerCase().includes(itemName.toLowerCase())) || 
                    wardrobeItems.find(item => itemName.toLowerCase().includes(item.name.toLowerCase()))
                ).filter(Boolean);

                const spotlightItem = outfit.spotlightItem ? 
                    wardrobeItems.find(item => item.name.toLowerCase().includes(outfit.spotlightItem.toLowerCase())) ||
                    wardrobeItems.find(item => outfit.spotlightItem.toLowerCase().includes(item.name.toLowerCase()))
                    : matchedItems[0];

                return {
                    name: outfit.name,
                    occasion: outfit.occasion,
                    temperature: outfit.temperature,
                    reasoning: outfit.reasoning,
                    items: matchedItems,
                    spotlightItem: spotlightItem,
                    styling: outfit.styling || {
                        description: "Classic styling approach",
                        colorTips: "Match similar tones",
                        sizingTips: "Ensure proper fit",
                        alternatives: []
                    }
                };
            });
            
            return outfits.filter(outfit => outfit.items.length >= 3);
        }

        return [];

    } catch (error) {
        console.error("Error generating outfit recommendations:", error);
        throw new Error("Failed to generate outfit recommendations. Please try again.");
    }
}

// --- COMPONENTS ---
const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-md w-full">
            <div className="flex justify-center items-center p-4">
                <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-8 h-8 text-indigo-500" />
                    <h1 className="text-xl font-bold text-gray-800">AI Wardrobe Assistant</h1>
                </div>
            </div>
        </header>
    );
};

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );
};

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
        <p className="text-xs text-gray-600 mb-1 capitalize">{item.category}</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {item.colors.map((color, index) => (
            <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {color}
            </span>
          ))}
        </div>
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
              <p className="text-xs text-gray-500 capitalize">{item.category}</p>
              <div className="flex flex-wrap gap-1 mt-1 justify-center">
                {item.colors.slice(0, 2).map((color, colorIndex) => (
                  <span key={colorIndex} className="text-xs bg-gray-200 text-gray-600 px-1 rounded">
                    {color}
                  </span>
                ))}
              </div>
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
  
  const userId = 1; // Mock user ID for demo
  const queryClient = useQueryClient();

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
    },
    onError: (error) => {
      console.error('Error adding item:', error);
      setError('Failed to add item to wardrobe');
      setIsAnalyzing(false);
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

  const handleTakePhoto = async (photo: string) => {
    setIsCameraOpen(false);
    setIsAnalyzing(true);
    setAppState(AppState.AddingItem);
    
    try {
      const analyzedItem = await analyzeClothingItem(photo);
      
      const wardrobeItem: InsertWardrobeItem = {
        userId,
        name: analyzedItem.name,
        category: analyzedItem.category,
        colors: analyzedItem.colors,
        image: photo,
        wearCount: 0,
        occasions: analyzedItem.occasions || [],
      };

      addItemMutation.mutate(wardrobeItem);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze item');
      setIsAnalyzing(false);
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
          
          const wardrobeItem: InsertWardrobeItem = {
            userId,
            name: analyzedItem.name,
            category: analyzedItem.category,
            colors: analyzedItem.colors,
            image: photo,
            wearCount: 0,
            occasions: analyzedItem.occasions || [],
          };

          await new Promise<void>((resolve, reject) => {
            addItemMutation.mutate(wardrobeItem, {
              onSuccess: () => resolve(),
              onError: (error) => reject(error)
            });
          });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
    </div>
  );
};

export default App;