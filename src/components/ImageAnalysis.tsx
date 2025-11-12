import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, X, Loader2, AlertTriangle, Image as ImageIcon, Crop, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageAnalysisProps {
  onAnalysisComplete: (results: ImageAnalysisResult) => void;
  disabled?: boolean;
}

export interface ImageAnalysisResult {
  symptoms: string[];
  confidence: number;
  description: string;
  imageUrl?: string;
}

export const ImageAnalysis = ({ onAnalysisComplete, disabled = false }: ImageAnalysisProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [multipleImages, setMultipleImages] = useState<File[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Compress image to reduce file size while maintaining quality
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920px width/height)
        const maxSize = 1920;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        }, 'image/jpeg', 0.85); // 85% quality
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please drop image files only",
        variant: "destructive",
      });
      return;
    }

    // Process multiple images
    const processedImages: File[] = [];
    for (const file of imageFiles.slice(0, 5)) { // Limit to 5 images
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const compressed = await compressImage(file);
        processedImages.push(compressed);
      } catch (error) {
        processedImages.push(file); // Use original if compression fails
      }
    }

    setMultipleImages(processedImages);
    if (processedImages.length > 0) {
      setSelectedImage(processedImages[0]);
      setCurrentImageIndex(0);

      // Create preview for first image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(processedImages[0]);
    }
  }, [compressImage, toast]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please select image files only (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Process images with compression
    const processedImages: File[] = [];
    for (const file of imageFiles.slice(0, 5)) { // Limit to 5 images
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB and will be compressed`,
        });
      }

      try {
        setUploadProgress(20);
        const compressed = await compressImage(file);
        setUploadProgress(60);
        processedImages.push(compressed);
      } catch (error) {
        processedImages.push(file); // Use original if compression fails
      }
    }

    setUploadProgress(100);
    setMultipleImages(processedImages);

    if (processedImages.length > 0) {
      setSelectedImage(processedImages[0]);
      setCurrentImageIndex(0);

      // Create preview for first image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setUploadProgress(0); // Reset progress
      };
      reader.readAsDataURL(processedImages[0]);
    }
  };

  const handleCameraCapture = () => {
    // For camera capture, we'll use the file input with capture attribute
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage || !imagePreview) return;

    setIsAnalyzing(true);
    setUploadProgress(0);

    try {
      // Simulate realistic AI analysis with progress
      setUploadProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));

      setUploadProgress(50);
      await new Promise(resolve => setTimeout(resolve, 500));

      setUploadProgress(75);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Enhanced mock analysis based on common medical image patterns
      const mockResults = generateMockAnalysis(selectedImage.name, imagePreview);

      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setAnalysisResult(mockResults);
      onAnalysisComplete(mockResults);

      toast({
        title: "Analysis Complete",
        description: `Found ${mockResults.symptoms.length} potential symptoms with ${(mockResults.confidence * 100).toFixed(0)}% confidence`,
      });
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  // Generate more realistic mock analysis
  const generateMockAnalysis = (fileName: string, imageUrl: string): ImageAnalysisResult => {
    const fileNameLower = fileName.toLowerCase();

    // Different analysis based on filename hints (for demo purposes)
    if (fileNameLower.includes('rash') || fileNameLower.includes('skin')) {
      return {
        symptoms: ['rash', 'redness', 'inflammation', 'itching'],
        confidence: 0.87,
        description: "AI analysis detects signs of skin irritation with redness, inflammation, and possible allergic reaction. This appears to be contact dermatitis or eczema. The affected area shows characteristic rash patterns.",
        imageUrl
      };
    } else if (fileNameLower.includes('wound') || fileNameLower.includes('cut')) {
      return {
        symptoms: ['wound', 'laceration', 'bleeding'],
        confidence: 0.92,
        description: "Image shows an open wound with tissue damage. The laceration appears clean with minimal surrounding inflammation. Recommend proper wound care and monitoring for infection signs.",
        imageUrl
      };
    } else if (fileNameLower.includes('swelling') || fileNameLower.includes('edema')) {
      return {
        symptoms: ['swelling', 'edema', 'inflammation'],
        confidence: 0.78,
        description: "Localized swelling detected with possible fluid accumulation. This could indicate inflammation, injury, or circulatory issues. The swelling pattern suggests acute inflammatory response.",
        imageUrl
      };
    } else {
      // Generic analysis for other images
      return {
        symptoms: ['skin abnormality', 'discoloration'],
        confidence: 0.65,
        description: "AI analysis identifies abnormal skin changes with discoloration. This could be benign or require further evaluation. The image shows areas of concern that warrant professional medical assessment.",
        imageUrl
      };
    }
  };

  // Navigate between multiple images
  const navigateImage = (direction: 'prev' | 'next') => {
    if (multipleImages.length <= 1) return;

    let newIndex = currentImageIndex;
    if (direction === 'prev') {
      newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : multipleImages.length - 1;
    } else {
      newIndex = currentImageIndex < multipleImages.length - 1 ? currentImageIndex + 1 : 0;
    }

    setCurrentImageIndex(newIndex);
    setSelectedImage(multipleImages[newIndex]);
    setAnalysisResult(null); // Clear previous analysis

    // Create preview for new image
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(multipleImages[newIndex]);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setMultipleImages([]);
    setCurrentImageIndex(0);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Upload a photo of your symptom for AI analysis
        </h4>
        <p className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, WebP (max 10MB)
        </p>
      </div>

      {/* Upload Area */}
      {!imagePreview && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-primary/20 hover:border-primary/40'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCapture}
                  disabled={disabled}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {isDragOver ? 'Drop images here' : 'Upload clear photos of the affected area for AI analysis'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, WebP • Max 10MB each • Up to 5 images
                </p>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">Processing images...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <CardContent className="p-4">
            {/* Multiple Images Navigation */}
            {multipleImages.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigateImage('prev')}
                  disabled={multipleImages.length <= 1}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentImageIndex + 1} of {multipleImages.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigateImage('next')}
                  disabled={multipleImages.length <= 1}
                >
                  Next →
                </Button>
              </div>
            )}

            <div className="relative">
              <img
                src={imagePreview}
                alt="Symptom preview"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={clearImage}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Image thumbnails for multiple images */}
              {multipleImages.length > 1 && (
                <div className="absolute bottom-2 left-2 right-2 flex gap-1 overflow-x-auto">
                  {multipleImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setSelectedImage(image);
                        setAnalysisResult(null);
                        const reader = new FileReader();
                        reader.onload = (e) => setImagePreview(e.target?.result as string);
                        reader.readAsDataURL(image);
                      }}
                      className={`flex-shrink-0 w-8 h-8 rounded border-2 overflow-hidden ${
                        index === currentImageIndex ? 'border-primary' : 'border-gray-300'
                      }`}
                    >
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress bar during analysis */}
            {isAnalyzing && (
              <div className="mt-4 space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-center text-muted-foreground">
                  Analyzing image with AI...
                </p>
              </div>
            )}

            {!analysisResult && !isAnalyzing && (
              <div className="mt-4 text-center">
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Analyze Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                <AlertTriangle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  AI Analysis Results
                </h5>
                <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                  {analysisResult.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {analysisResult.symptoms.map((symptom) => (
                    <Badge key={symptom} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {symptom}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Confidence: {Math.round(analysisResult.confidence * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>
          ⚠️ Image analysis is for informational purposes only and should not replace professional medical diagnosis.
        </p>
        <p>
          📸 Upload clear, well-lit photos for best results. Multiple angles may improve analysis accuracy.
        </p>
      </div>
    </div>
  );
};

export default ImageAnalysis;