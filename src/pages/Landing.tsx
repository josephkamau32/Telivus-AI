import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Brain, Shield, Zap, Heart, CheckCircle, MessageSquare, ClipboardList, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

const Landing = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden py-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-light/10 dark:via-background dark:to-secondary-light/10 transition-colors duration-500" />
        
        {/* Floating orbs animation */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '1s' }} />
        
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
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-shift">
              {t.landingHeroTitle}
            </h1>

            <div className="flex items-center justify-center gap-2 mb-8">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <p className="text-xl md:text-2xl text-foreground font-medium">
                {t.landingHeroSubtitle}
              </p>
              <Sparkles className="w-6 h-6 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              {t.landingHeroDescription}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {t.landingGetStarted}
                </Button>
              </Link>
              
              <Link to="/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-6 border-primary/30 hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold backdrop-blur-sm"
                >
                  {t.landingLearnMore}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">{t.howTelivusHelps}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.experienceFutureHealthcare}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <ClipboardList className="relative w-12 h-12 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">{t.healthAssessment}</h3>
              <p className="text-muted-foreground text-center">{t.comprehensiveSymptomAnalysis}</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <MessageSquare className="relative w-12 h-12 text-secondary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">{t.aiHealthChat}</h3>
              <p className="text-muted-foreground text-center">{t.conversationalAIAssistant}</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Shield className="relative w-12 h-12 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">{t.securePrivate}</h3>
              <p className="text-muted-foreground text-center">{t.healthDataProtected}</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Heart className="relative w-12 h-12 text-secondary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">{t.personalizedCare}</h3>
              <p className="text-muted-foreground text-center">{t.tailoredRecommendations}</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-foreground">{t.whyChooseTelivus}</h2>
              <p className="text-lg text-muted-foreground">
                {t.joinThousandsUsers}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">{t.advancedAI}</h4>
                  <p className="text-muted-foreground">{t.cuttingEdgeMLAlgorithms}</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">{t.instantResults}</h4>
                  <p className="text-muted-foreground">{t.healthInsightsSeconds}</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">{t.alwaysAvailable}</h4>
                  <p className="text-muted-foreground">{t.access247Guidance}</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">{t.easyToUse}</h4>
                  <p className="text-muted-foreground">{t.simpleInterfaceEveryone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 text-foreground">{t.readyTakeControl}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t.joinTelivusToday}
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="text-lg px-12 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold"
            >
              <Zap className="w-5 h-5 mr-2" />
              {t.startJourneyNow}
            </Button>
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Landing;