import { Button } from '@/components/ui/button';
import { Heart, Shield, Zap } from 'lucide-react';

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export const HeroSection = ({ onStartAssessment }: HeroSectionProps) => {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-primary-light to-secondary-light">
      <div className="container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary rounded-full">
              <Heart className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            MediSense AI
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-medium">
            Your AI-powered health companion for smarter self-care.
          </p>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Get personalized health insights and recommendations based on your symptoms. 
            Fast, reliable, and designed to help you make informed health decisions.
          </p>
          
          <Button 
            onClick={onStartAssessment}
            size="lg"
            className="text-lg px-8 py-4 bg-primary hover:bg-primary-dark text-primary-foreground"
          >
            Start Health Assessment
          </Button>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border">
              <Shield className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">Your health data is processed securely and never stored permanently.</p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border">
              <Zap className="w-8 h-8 text-secondary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
              <p className="text-muted-foreground">Get AI-powered health insights in seconds, not hours.</p>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border">
              <Heart className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Personalized Care</h3>
              <p className="text-muted-foreground">Tailored recommendations based on your specific symptoms and profile.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};