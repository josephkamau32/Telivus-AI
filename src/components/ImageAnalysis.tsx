import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, Loader2, AlertTriangle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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
    try {
      // For demo purposes, we'll simulate AI analysis
      // In a real implementation, this would call an AI vision API

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock analysis results based on image content
      // In reality, this would come from an AI service like Google Vision AI, AWS Rekognition, etc.
      const mockResults: ImageAnalysisResult = {
        symptoms: ['rash', 'redness', 'inflammation'],
        confidence: 0.85,
        description: "The image shows signs of skin irritation with redness and possible allergic reaction. This appears to be a contact dermatitis or allergic rash.",
        imageUrl: imagePreview
      };

      setAnalysisResult(mockResults);
      onAnalysisComplete(mockResults);

      toast({
        title: "Analysis Complete",
        description: "Image analysis finished successfully",
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
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
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
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
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
                  Upload Photo
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
              <p className="text-sm text-muted-foreground">
                Upload a clear photo of the affected area for better analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <CardContent className="p-4">
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
            </div>

            {!analysisResult && (
              <div className="mt-4 text-center">
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Analyze Image
                    </>
                  )}
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
      <div className="text-xs text-muted-foreground text-center">
        <p>
          ⚠️ Image analysis is for informational purposes only and should not replace professional medical diagnosis.
        </p>
      </div>
    </div>
  );
};

export default ImageAnalysis;