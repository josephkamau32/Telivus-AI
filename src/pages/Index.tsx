import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type AppState = 'home' | 'assessment' | 'report' | 'loading';

interface AssessmentData {
  feelings: string;
  symptoms: string[];
  age: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('home');
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportTimestamp, setReportTimestamp] = useState<string>('');
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleStartAssessment = () => {
    setAppState('assessment');
  };

  const handleAssessmentComplete = async (data: AssessmentData) => {
    setAppState('loading');
    setAssessmentData(data);

    // Client-side validation
    const validationErrors: string[] = [];
    if (!data.feelings?.trim()) validationErrors.push('Feeling is required');
    if (!data.symptoms?.length) validationErrors.push('At least one symptom is required');
    if (!data.age || data.age < 0 || data.age > 130) validationErrors.push('Age must be between 0 and 130');

    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      setAppState('assessment');
      return;
    }

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: reportData, error } = await supabase.functions.invoke('generate-medical-report', {
        body: {
          feelings: data.feelings,
          symptoms: data.symptoms,
          age: Number(data.age),
          userId: user.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      // Pass the full report object directly to the component
      const timestamp = reportData.timestamp || new Date().toISOString();

      setCurrentReport(reportData);
      setReportTimestamp(timestamp);
      setAppState('report');

      toast({
        title: "Report Generated",
        description: "Your health assessment is ready!",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isQuotaExceeded = errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED');
      const isRateLimited = errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED');
      
      toast({
        title: isQuotaExceeded ? "API Quota Exceeded" : isRateLimited ? "Rate Limited" : "Generation Failed",
        description: isQuotaExceeded 
          ? "The AI service quota has been exceeded. Please upgrade to a paid plan or try again in an hour."
          : isRateLimited 
          ? "Too many requests. Please wait a moment and try again." 
          : "Failed to generate your health report. Please try again.",
        variant: "destructive",
      });
      setAppState('assessment');
    }
  };

  const handleBackToHome = () => {
    setAppState('home');
    setCurrentReport(null);
    setAssessmentData(null);
  };

  const handleBackFromAssessment = () => {
    setAppState('home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light to-secondary-light flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Generating Your Report</h2>
          <p className="text-muted-foreground mb-4">AI is analyzing your symptoms and creating personalized recommendations...</p>
          <div className="bg-background/20 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span>Processing your health data</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <span>Consulting medical databases</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <span>Generating recommendations</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'assessment') {
    return (
      <SymptomFlow 
        onComplete={handleAssessmentComplete} 
        onBack={handleBackFromAssessment}
      />
    );
  }

  if (appState === 'report' && assessmentData) {
    return (
      <MedicalReport 
        report={currentReport}
        userInfo={assessmentData}
        timestamp={reportTimestamp}
        onBackToHome={handleBackToHome}
      />
    );
  }

  return <HeroSection onStartAssessment={handleStartAssessment} onSignOut={handleSignOut} />;
};

export default Index;
