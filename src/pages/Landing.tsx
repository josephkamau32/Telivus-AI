import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Brain, Shield, Zap, Heart, CheckCircle, MessageSquare, ClipboardList, Sparkles } from 'lucide-react';

const Landing = () => {
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
              Your AI Health Companion
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-8">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <p className="text-xl md:text-2xl text-foreground font-medium">
                Smart healthcare insights at your fingertips
              </p>
              <Sparkles className="w-6 h-6 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Telivus uses advanced AI to analyze your symptoms and provide personalized health recommendations. 
              Get instant insights, connect with our AI health assistant, and take control of your wellness journey.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button 
                  size="lg"
                  className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              
              <Link to="/about">
                <Button 
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-6 border-primary/30 hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold backdrop-blur-sm"
                >
                  Learn More
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
            <h2 className="text-4xl font-bold mb-4 text-foreground">How Telivus Helps You</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of healthcare with our AI-powered platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <ClipboardList className="relative w-12 h-12 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">Health Assessment</h3>
              <p className="text-muted-foreground text-center">Comprehensive symptom analysis with instant AI-powered insights</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <MessageSquare className="relative w-12 h-12 text-secondary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">AI Health Chat</h3>
              <p className="text-muted-foreground text-center">24/7 conversational AI assistant for health questions</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Shield className="relative w-12 h-12 text-primary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">Secure & Private</h3>
              <p className="text-muted-foreground text-center">Your health data protected with enterprise-grade security</p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-4 mx-auto w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Heart className="relative w-12 h-12 text-secondary mx-auto" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-center text-foreground">Personalized Care</h3>
              <p className="text-muted-foreground text-center">Tailored recommendations based on your unique profile</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-foreground">Why Choose Telivus?</h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of users who trust Telivus for their health insights
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Advanced AI Technology</h4>
                  <p className="text-muted-foreground">Powered by cutting-edge machine learning algorithms</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Instant Results</h4>
                  <p className="text-muted-foreground">Get health insights in seconds, not hours</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Always Available</h4>
                  <p className="text-muted-foreground">24/7 access to health guidance whenever you need it</p>
                </div>
              </div>
              
              <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Easy to Use</h4>
                  <p className="text-muted-foreground">Simple interface designed for everyone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 text-foreground">Ready to Take Control of Your Health?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join Telivus today and experience the future of personalized healthcare
          </p>
          <Link to="/auth">
            <Button 
              size="lg"
              className="text-lg px-12 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transform hover:scale-105 transition-all duration-300 font-semibold"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Your Journey Now
            </Button>
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Landing;