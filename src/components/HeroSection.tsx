import { Button } from '@/components/ui/button';
import { Heart, Shield, Zap, LogOut, Brain, Sparkles, MessageSquare, BarChart3 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';

interface HeroSectionProps {
  onStartAssessment: () => void;
  onSignOut: () => void;
}

export const HeroSection = ({ onStartAssessment, onSignOut }: HeroSectionProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-light/10 dark:via-background dark:to-secondary-light/10 transition-colors duration-500" />
      
      {/* Floating orbs animation */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '1s' }} />
      
      {/* Top navigation */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <ThemeToggle />
        <Button
          onClick={onSignOut}
          variant="outline"
          className="backdrop-blur-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t.signOut}
        </Button>
      </div>
      
      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* AI Icon with glow effect */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50 animate-glow-pulse" />
              <div className="relative p-6 bg-gradient-to-br from-primary to-secondary rounded-full shadow-glow">
                <Brain className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          
          {/* Title with gradient text */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-shift">
            Telivus AI
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <p className="text-lg sm:text-xl md:text-2xl text-foreground font-medium">
              {t.heroDescription}
            </p>
            <Sparkles className="w-6 h-6 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <p className="text-base sm:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubDescription}
          </p>
          
          {/* CTA Buttons with enhanced styling */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={onStartAssessment}
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold"
            >
              <Zap className="w-5 h-5 mr-2" />
              {t.startAssessment}
            </Button>

            <Button
              onClick={() => navigate('/chat')}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-primary/30 hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold backdrop-blur-sm"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {t.aiHealthChat}
            </Button>

            <Button
              onClick={() => navigate('/health-dashboard')}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-secondary/30 hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold backdrop-blur-sm"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Health Dashboard
            </Button>
          </div>
          
          {/* Feature cards with enhanced design */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="group bg-card/60 backdrop-blur-md p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Shield className="relative w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{t.securePrivate}</h3>
              <p className="text-muted-foreground">{t.secureDescription}</p>
            </div>
            
            <div className="group bg-card/60 backdrop-blur-md p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Zap className="relative w-10 h-10 text-secondary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{t.instantResults}</h3>
              <p className="text-muted-foreground">{t.instantDescription}</p>
            </div>
            
            <div className="group bg-card/60 backdrop-blur-md p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Heart className="relative w-10 h-10 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{t.personalizedCare}</h3>
              <p className="text-muted-foreground">{t.personalizedDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};