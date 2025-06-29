
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- TYPES ---
interface OutfitRecommendation {
  name: string;
  items: string[];
}

// --- ICONS ---
const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.5 17.5l-1.5 1.5M18.5 5.5l1.5-1.5M12 2v2M12 20v2M4.5 12H2m20 0h-2.5m-5-5l1.5-1.5M5.5 18.5l1.5-1.5m12 .5l-1.5-1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
  </svg>
);

// --- GEMINI SERVICE ---
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT = `You are a fashion stylist. Analyze the clothing items in the attached images. First, create a list of all unique clothing items you can identify. Then, based on that list, generate at least three distinct and fashionable outfit recommendations. Only use items from the images. Respond with a JSON object. The JSON should have a single key 'outfits' which is an array of objects. Each object in the array should represent one outfit and have two keys: 'name' (a creative title for the outfit, e.g., 'Urban Explorer') and 'items' (an array of strings, where each string is a description of a clothing item in that outfit). If no clothing items are identifiable, return an empty 'outfits' array.`;

async function getOutfitRecommendations(photos: string[]): Promise<OutfitRecommendation[]> {
    if (photos.length === 0) {
        return [];
    }
    
    const imageParts = photos.map(photo => {
        return {
            inlineData: {
                mimeType: 'image/jpeg',
                data: photo.split(',')[1], // remove the data:image/jpeg;base64, prefix
            },
        };
    });

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: { parts: [{ text: PROMPT }, ...imageParts] },
            config: {
                responseMimeType: "application/json",
            },
        });

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        const parsedData = JSON.parse(jsonStr);

        if (parsedData && Array.isArray(parsedData.outfits)) {
            return parsedData.outfits as OutfitRecommendation[];
        }

        return [];

    } catch (error) {
        console.error("Error generating recommendations:", error);
        throw new Error("Failed to get recommendations from AI. Please try again.");
    }
}

// --- COMPONENTS ---
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
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" },
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="w-16"></div>
      </div>
    </div>
  );
};


interface RecommendationCardProps {
  recommendation: OutfitRecommendation;
  index: number;
}
const colors = [
    'from-purple-400 to-indigo-500',
    'from-green-400 to-blue-500',
    'from-pink-400 to-red-500',
    'from-yellow-400 to-orange-500',
];
const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, index }) => {
  const colorClass = colors[index % colors.length];

  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-2xl shadow-lg p-6 text-white`}>
      <h3 className="text-2xl font-bold mb-3">{recommendation.name}</h3>
      <ul className="space-y-2">
        {recommendation.items.map((item, i) => (
          <li key={i} className="flex items-center">
            <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- MAIN APP ---
enum AppState {
  Welcome,
  Capturing,
  Loading,
  Results,
  Error,
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Welcome);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTakePhoto = (photo: string) => {
    setPhotos(prev => [...prev, photo]);
    setIsCameraOpen(false);
    setAppState(AppState.Capturing);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleGetRecommendations = useCallback(async () => {
    if (photos.length === 0) {
      setError("Please add at least one photo of your clothes.");
      setAppState(AppState.Error);
      return;
    }
    setAppState(AppState.Loading);
    setError(null);
    try {
      const result = await getOutfitRecommendations(photos);
      if (result.length > 0) {
        setRecommendations(result);
        setAppState(AppState.Results);
      } else {
        setError("Couldn't find any outfits. Try taking clearer photos or adding more items!");
        setAppState(AppState.Error);
      }
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setAppState(AppState.Error);
    }
  }, [photos]);
  
  const resetApp = () => {
      setPhotos([]);
      setRecommendations([]);
      setError(null);
      setIsCameraOpen(false);
      setAppState(AppState.Welcome);
  };
  
  const renderContent = () => {
    switch (appState) {
        case AppState.Loading:
            return (
                <div className="text-center p-10">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Finding your style...</h2>
                    <p className="text-gray-500 mb-6">Our AI is mixing and matching your items.</p>
                    <LoadingSpinner />
                </div>
            );
        case AppState.Results:
            return (
                <div className="p-4 space-y-6">
                    <h2 className="text-center text-3xl font-bold text-gray-800">Your Outfits</h2>
                    {recommendations.map((rec, index) => (
                        <RecommendationCard key={index} recommendation={rec} index={index} />
                    ))}
                     <button onClick={resetApp} className="w-full flex justify-center items-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors duration-300 shadow-lg">
                        <ArrowPathIcon className="w-5 h-5"/>
                        <span>Start Over</span>
                    </button>
                </div>
            );
        case AppState.Error:
             return (
                <div className="text-center p-10 bg-red-50 rounded-lg">
                    <h2 className="text-2xl font-semibold text-red-700 mb-4">Oops! Something went wrong.</h2>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button onClick={() => setAppState(photos.length > 0 ? AppState.Capturing : AppState.Welcome)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                        Try Again
                    </button>
                </div>
            );
        case AppState.Capturing:
        case AppState.Welcome:
        default:
            return (
                <div className="p-4 flex flex-col items-center text-center">
                    {photos.length === 0 && (
                        <div className="my-8">
                            <h2 className="text-3xl font-bold text-gray-800">Style Your Wardrobe</h2>
                            <p className="text-gray-600 mt-2">Take photos of your clothes and let AI create outfits for you.</p>
                        </div>
                    )}

                    {photos.length > 0 && (
                        <div className="w-full mb-4">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Your Items ({photos.length})</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img src={photo} alt={`Clothing item ${index + 1}`} className="rounded-lg object-cover aspect-square" />
                                        <button onClick={() => handleRemovePhoto(index)} className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XCircleIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="w-full space-y-4 mt-4">
                        <button onClick={() => setIsCameraOpen(true)} className="w-full flex justify-center items-center space-x-2 border-2 border-indigo-600 text-indigo-600 font-bold py-3 px-4 rounded-xl hover:bg-indigo-50 transition-colors duration-300">
                             <CameraIcon className="w-6 h-6"/>
                            <span>{photos.length > 0 ? 'Add Another Photo' : 'Take a Photo'}</span>
                        </button>
                        {photos.length > 0 && (
                            <button onClick={handleGetRecommendations} className="w-full flex justify-center items-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors duration-300 shadow-lg">
                                <SparklesIcon className="w-6 h-6"/>
                                <span>Get Recommendations</span>
                            </button>
                        )}
                    </div>
                </div>
            );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <Header onReset={resetApp} />
        <main className="flex-grow">
          {renderContent()}
        </main>
        {isCameraOpen && (
          <CameraView
            onTakePhoto={handleTakePhoto}
            onClose={() => setIsCameraOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

// --- RENDERER ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
