import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Palette, 
  RotateCcw, 
  Download, 
  Share2,
  X,
  Settings,
  Eye,
  Camera,
  Brush,
  Layers,
  Droplets,
  Crop,
  Users,
  Car,
  Coffee,
  Utensils,
  Apple,
  Banana,
  Circle,
  Sofa,
  Tv,
  Laptop,
  Mouse,
  Keyboard,
  Smartphone
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

interface AIEffect {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  parameter: string;
  value: string | number;
  type: 'select' | 'toggle' | 'range';
  options?: { value: string; label: string; icon?: React.ReactNode }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

interface AIFunModeProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
  eventTitle: string;
}

const AI_EFFECTS: AIEffect[] = [
  {
    id: 'ai-crop',
    name: 'AI Object Focus',
    description: 'Automatically crop to focus on specific objects',
    icon: <Crop className="w-4 h-4" />,
    parameter: 'fo',
    value: '',
    type: 'select',
    options: [
      { value: '', label: 'Original', icon: <Eye className="w-3 h-3" /> },
      { value: 'person', label: 'Person', icon: <Users className="w-3 h-3" /> },
      { value: 'pizza', label: 'Pizza', icon: <Palette className="w-3 h-3" /> },
      { value: 'bottle', label: 'Bottle', icon: <Droplets className="w-3 h-3" /> },
      { value: 'book', label: 'Book', icon: <Layers className="w-3 h-3" /> },
      { value: 'cup', label: 'Cup', icon: <Coffee className="w-3 h-3" /> },
      { value: 'fork', label: 'Fork', icon: <Utensils className="w-3 h-3" /> },
      { value: 'knife', label: 'Knife', icon: <Utensils className="w-3 h-3" /> },
      { value: 'spoon', label: 'Spoon', icon: <Utensils className="w-3 h-3" /> },
      { value: 'bowl', label: 'Bowl', icon: <Circle className="w-3 h-3" /> },
      { value: 'banana', label: 'Banana', icon: <Banana className="w-3 h-3" /> },
      { value: 'apple', label: 'Apple', icon: <Apple className="w-3 h-3" /> },
      { value: 'chair', label: 'Chair', icon: <Car className="w-3 h-3" /> },
      { value: 'couch', label: 'Couch', icon: <Sofa className="w-3 h-3" /> },
      { value: 'tv', label: 'TV', icon: <Tv className="w-3 h-3" /> },
      { value: 'laptop', label: 'Laptop', icon: <Laptop className="w-3 h-3" /> },
      { value: 'mouse', label: 'Mouse', icon: <Mouse className="w-3 h-3" /> },
      { value: 'remote', label: 'Remote', icon: <Camera className="w-3 h-3" /> },
      { value: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-3 h-3" /> },
      { value: 'cellPhone', label: 'Cell Phone', icon: <Smartphone className="w-3 h-3" /> }
    ]
  },
  {
    id: 'ai-bg-remove',
    name: 'AI Background Removal',
    description: 'Remove background using AI',
    icon: <Brush className="w-4 h-4" />,
    parameter: 'e-removedotbg',
    value: '',
    type: 'toggle'
  }
];

export default function AIFunMode({ isOpen, onClose, imageUrl, imageAlt, eventTitle }: AIFunModeProps) {
  const [effects, setEffects] = useState<AIEffect[]>(AI_EFFECTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');

  // Generate AI-enhanced image URL
  const generateAIUrl = useCallback((imageUrl: string, activeEffects: AIEffect[]) => {
    if (!imageUrl.includes('ik.imagekit.io')) {
      return imageUrl;
    }

    try {
      const url = new URL(imageUrl);
      const pathname = url.pathname;
      
      const pathSegments = pathname.split('/').map(segment => {
        return segment ? encodeURIComponent(decodeURIComponent(segment)) : segment;
      });
      const encodedPath = pathSegments.join('/');
      const baseUrl = `${url.protocol}//${url.host}${encodedPath}`;
      
      // Get active effects (non-zero/non-empty values)
      const activeParams = activeEffects
        .filter(effect => {
          if (effect.type === 'toggle') {
            return effect.value === 'true';
          }
          if (effect.type === 'select') {
            return effect.value !== '';
          }
          if (effect.type === 'range') {
            return effect.value !== 0;
          }
          return false;
        })
        .map(effect => {
          if (effect.type === 'toggle') {
            return effect.parameter;
          }
          if (effect.type === 'select') {
            return `${effect.parameter}-${effect.value}`;
          }
          if (effect.type === 'range') {
            return `${effect.parameter}-${effect.value}`;
          }
          return effect.parameter;
        })
        .filter((param, index, array) => {
          // Avoid conflicts: don't combine background removal with object focus
          if (param === 'e-removedotbg') {
            return !array.some(p => p.startsWith('fo-'));
          }
          if (param.startsWith('fo-')) {
            return !array.includes('e-removedotbg');
          }
          return true;
        });
      
      // Base transformations optimized for fast loading
      const baseTransformations = ['f-webp', 'q-85', 'pr-true'];
      
      // Combine all transformations
      const allTransformations = [...activeParams, ...baseTransformations];
      
      if (allTransformations.length > 0) {
        return `${baseUrl}?tr=${allTransformations.join(',')}`;
      }
      
      return `${baseUrl}?tr=${baseTransformations.join(',')}`;
    } catch (error) {
      console.error('Error generating AI URL:', error);
      return imageUrl;
    }
  }, []);

  const currentImageUrl = generateAIUrl(imageUrl, effects);
  
  // Handle AI processing with loading states
  useEffect(() => {
    const hasAIEffects = effects.some(effect => {
      if (effect.type === 'toggle') {
        return effect.value === 'true';
      }
      if (effect.type === 'select') {
        return effect.value !== '';
      }
      if (effect.type === 'range') {
        return effect.value !== 0;
      }
      return false;
    });

    if (hasAIEffects) {
      setIsProcessing(true);
      // Preload the AI-processed image
      const img = new window.Image();
      img.onload = () => {
        setProcessedImageUrl(currentImageUrl);
        setIsProcessing(false);
      };
      img.onerror = () => {
        console.error('Failed to load AI processed image');
        setIsProcessing(false);
      };
      img.src = currentImageUrl;
    } else {
      setProcessedImageUrl(imageUrl);
      setIsProcessing(false);
    }
  }, [currentImageUrl, imageUrl, effects]);
  
  // Debug logging
  useEffect(() => {
    console.log('AI Effects:', effects);
    console.log('Generated URL:', currentImageUrl);
    console.log('Processing:', isProcessing);
  }, [effects, currentImageUrl, isProcessing]);



  const resetEffects = () => {
    setEffects(AI_EFFECTS);
  };

  const updateEffect = (effectId: string, value: string | number) => {
    setEffects(prev => prev.map(effect => 
      effect.id === effectId ? { ...effect, value } : effect
    ));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImageUrl;
    link.download = `${eventTitle}-ai-enhanced.jpg`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventTitle} - AI Enhanced`,
          url: currentImageUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(currentImageUrl);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'h':
      case 'H':
        setShowControls(prev => !prev);
        break;
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white hover:text-gray-300 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Toggle controls button */}
      <button
        onClick={() => setShowControls(prev => !prev)}
        className="absolute top-4 left-4 z-10 p-2 text-white hover:text-gray-300 transition-colors"
        title="Toggle controls (H)"
      >
        <Settings size={24} />
      </button>

      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleDownload}
          className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          title="Download AI enhanced image"
        >
          <Download size={20} />
        </button>
        <button
          onClick={handleShare}
          className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          title="Share image"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex items-center justify-center h-full pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={processedImageUrl}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* AI Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-20">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-zurich mx-auto mb-4"></div>
                  <p className="text-lg font-medium mb-2">AI Processing...</p>
                  <p className="text-sm text-gray-300">Enhancing your image with AI</p>
                </div>
              </div>
            )}
            
            {/* Initial Loading */}
            {isLoading && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-20">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zurich mx-auto mb-4"></div>
                  <p className="text-sm text-gray-300">Loading image...</p>
                </div>
              </div>
            )}
            
            <Image
              src={processedImageUrl || imageUrl}
              alt={`${imageAlt} - AI Enhanced`}
              width={1200}
              height={800}
              className="max-w-full max-h-[calc(100vh-240px)] object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              priority
              quality={90}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* AI Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-0 top-0 h-full w-80 bg-black/80 backdrop-blur-md border-r border-white/20 overflow-y-auto z-30"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-800 rounded-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Fun Mode</h2>
                  <p className="text-sm text-gray-300">Transform images with AI</p>
                </div>
              </div>



              {/* Reset button */}
              <button
                onClick={resetEffects}
                className="w-full mb-6 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </button>

              {/* AI Effects */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">AI Effects</h3>
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-xs text-zurich">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-zurich"></div>
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
                {effects.map((effect) => (
                  <div key={effect.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1 bg-white/10 rounded">
                        {effect.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">{effect.name}</h4>
                        <p className="text-xs text-gray-400">{effect.description}</p>
                      </div>
                    </div>
                    
                    {effect.type === 'select' && effect.options && (
                      <div className="space-y-2">
                        <select
                          value={effect.value as string}
                          onChange={(e) => updateEffect(effect.id, e.target.value)}
                          className="w-full p-2 bg-white/10 text-white rounded border border-white/20 text-sm"
                        >
                          {effect.options.map((option) => (
                            <option key={option.value} value={option.value} className="bg-gray-800">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {effect.type === 'toggle' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => updateEffect(effect.id, effect.value === 'true' ? '' : 'true')}
                          className={`w-full p-2 rounded text-sm font-medium transition-all ${
                            effect.value === 'true'
                              ? 'bg-blue-800 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {effect.value === 'true' ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}
                    
                    {effect.type === 'range' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>{effect.min}{effect.unit}</span>
                          <span className="font-medium">
                            {effect.value}{effect.unit}
                          </span>
                          <span>{effect.max}{effect.unit}</span>
                        </div>
                        
                        <input
                          type="range"
                          min={effect.min}
                          max={effect.max}
                          step={effect.step}
                          value={effect.value as number}
                          onChange={(e) => updateEffect(effect.id, Number(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="mt-6 p-3 bg-zurich/20 border border-zurich/30 rounded-lg">
                <p className="text-xs text-zurich/80">
                  💡 Press <kbd className="px-1 bg-white/20 rounded text-xs">H</kbd> to toggle controls
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium flex items-center gap-2">
          {isProcessing && (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-zurich"></div>
          )}
          <span>AI Fun Mode</span>
        </div>
      </div>
    </div>
  );
} 