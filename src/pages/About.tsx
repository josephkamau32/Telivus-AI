import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Brain, Heart, Target, Users, Award, Zap } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-light/10 dark:via-background dark:to-secondary-light/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-shift">
              About Telivus
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Empowering individuals with AI-driven health insights for better self-care decisions
            </p>
          </div>
        </div>
      </section>
      
      {/* Mission Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-foreground">Our Mission</h2>
              <p className="text-lg text-muted-foreground">
                Making quality healthcare guidance accessible to everyone, everywhere
              </p>
            </div>
            
            <div className="bg-card p-8 md:p-12 rounded-2xl border border-border/40 shadow-card">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                At Telivus, we believe that everyone deserves access to reliable health information and guidance. 
                Our AI-powered platform combines cutting-edge technology with medical expertise to provide 
                personalized health insights that help you make informed decisions about your wellbeing.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We're committed to bridging the gap between technology and healthcare, making professional-grade 
                health assessment tools available at your fingertips, 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Brain className="relative w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Innovation</h3>
              <p className="text-muted-foreground">
                Constantly pushing boundaries with cutting-edge AI technology to improve healthcare accessibility
              </p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Heart className="relative w-12 h-12 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Empathy</h3>
              <p className="text-muted-foreground">
                Putting users first with compassionate, personalized care that understands individual needs
              </p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Target className="relative w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Accuracy</h3>
              <p className="text-muted-foreground">
                Delivering precise, evidence-based insights powered by advanced medical algorithms
              </p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Users className="relative w-12 h-12 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Accessibility</h3>
              <p className="text-muted-foreground">
                Making quality healthcare guidance available to everyone, regardless of location or background
              </p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-primary/20 hover:border-primary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Award className="relative w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Trust</h3>
              <p className="text-muted-foreground">
                Building confidence through transparent processes and secure, private data handling
              </p>
            </div>
            
            <div className="group bg-card p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="relative mb-6 w-fit">
                <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg group-hover:blur-xl transition-all" />
                <Zap className="relative w-12 h-12 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Speed</h3>
              <p className="text-muted-foreground">
                Providing instant results when you need them most, without compromising on quality
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Technology Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-foreground">Powered by Advanced AI</h2>
              <p className="text-lg text-muted-foreground">
                Our technology stack combines the best of modern healthcare and artificial intelligence
              </p>
            </div>
            
            <div className="bg-card p-8 md:p-12 rounded-2xl border border-border/40 shadow-card">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Telivus leverages state-of-the-art machine learning models trained on vast medical datasets 
                to provide accurate symptom analysis and health recommendations. Our AI continuously learns 
                and improves, ensuring you receive the most up-to-date guidance.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                With enterprise-grade security and privacy measures, your health data remains completely 
                confidential while our algorithms work to provide you with personalized insights.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default About;