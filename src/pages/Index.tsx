import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow, type PatientData } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AppState = 'home' | 'assessment' | 'report' | 'loading';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [appState, setAppState] = useState<AppState>('home');
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportTimestamp, setReportTimestamp] = useState<string>('');
  const [assessmentData, setAssessmentData] = useState<PatientData | null>(null);
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleStartAssessment = () => {
    setAppState('assessment');
  };

  const handleAssessmentComplete = async (data: PatientData) => {
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
          name: data.name,
          gender: data.gender,
          medicalHistory: data.medicalHistory,
          surgicalHistory: data.surgicalHistory,
          currentMedications: data.currentMedications,
          allergies: data.allergies,
          userId: user.id
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.log('Testing function with new API key...');

        // Check if it's a FunctionsHttpError (which indicates HTTP error status)
        if (error.name === 'FunctionsHttpError') {
          // For FunctionsHttpError, check if we can access the status
          const httpError = error as any;
          if (httpError.status === 429 || httpError.statusCode === 429) {
            throw new Error('API_QUOTA_EXCEEDED');
          }

          // If we can't get the status but it's a FunctionsHttpError with this message,
          // it's likely a quota/rate limit issue
          if (error.message?.includes('Edge Function returned a non-2xx status code')) {
            // Since we can't determine the exact status, we'll provide a general error message
            // but prioritize quota-related issues
            throw new Error('SERVICE_UNAVAILABLE');
          }
        }

        // Check if it's a 429 (rate limit/quota exceeded) error
        const errorString = JSON.stringify(error).toLowerCase();
        if (errorString.includes('429') ||
            errorString.includes('too many requests') ||
            errorString.includes('quota exceeded') ||
            errorString.includes('rate limit')) {
          throw new Error('API_QUOTA_EXCEEDED');
        }

        // Check error message for quota-related content
        if (error.message?.toLowerCase().includes('quota') ||
            error.message?.toLowerCase().includes('rate limit') ||
            error.message?.includes('429')) {
          throw new Error('API_QUOTA_EXCEEDED');
        }

        throw new Error(error.message || 'Failed to generate report');
      }

      if (!reportData) {
        throw new Error('No report data received from server');
      }

      // Check if the response indicates an error
      if (reportData.error) {
        const errorCode = reportData.error_code;
        if (errorCode === 'QUOTA_EXCEEDED') {
          throw new Error('API_QUOTA_EXCEEDED');
        }
        throw new Error(reportData.error);
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
      const isQuotaExceeded = errorMessage === 'API_QUOTA_EXCEEDED' || errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('API quota exceeded');
      const isServiceUnavailable = errorMessage === 'SERVICE_UNAVAILABLE';
      const isRateLimited = errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED') || errorMessage.includes('Too many requests');
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection');
      const isValidationError = errorMessage.includes('Validation failed') || errorMessage.includes('required');

      let title = "Generation Failed";
      let description = "Failed to generate your health report. Please try again.";

      if (isQuotaExceeded) {
        title = "API Quota Exceeded";
        description = "The AI service quota has been exceeded. Please upgrade to a paid plan or try again in an hour.";
      } else if (isServiceUnavailable) {
        title = "Service Temporarily Unavailable";
        description = "The AI service is temporarily unavailable. This is usually due to high demand or quota limits. Please try again in a few minutes.";
      } else if (isRateLimited) {
        title = "Rate Limited";
        description = "Too many requests. Please wait a moment and try again.";
      } else if (isNetworkError) {
        title = "Connection Error";
        description = "Network issue detected. Please check your connection and try again.";
      } else if (isValidationError) {
        title = "Validation Error";
        description = errorMessage;
      }

      toast({
        title,
        description,
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
