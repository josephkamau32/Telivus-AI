import { useState } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { useToast } from '@/hooks/use-toast';
import { useHealthReports } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';

type AppState = 'home' | 'assessment' | 'report' | 'loading';

interface AssessmentData {
  feelings: string;
  symptoms: string[];
  age: number;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [currentReport, setCurrentReport] = useState<string>('');
  const [reportTimestamp, setReportTimestamp] = useState<string>('');
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const { toast } = useToast();
  const { addReport } = useHealthReports();

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
      const { data: reportData, error } = await supabase.functions.invoke('generate-medical-report', {
        body: {
          feelings: data.feelings,
          symptoms: data.symptoms,
          age: Number(data.age),
          userId: null // We don't have user auth yet
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      // Handle both structured JSON and text responses
      const report = reportData.text_report || reportData;
      const timestamp = reportData.timestamp || new Date().toISOString();
      
      // Save to local storage
      addReport({
        timestamp,
        userInfo: data,
        report: typeof report === 'string' ? report : JSON.stringify(report, null, 2),
      });

      setCurrentReport(typeof report === 'string' ? report : JSON.stringify(report, null, 2));
      setReportTimestamp(timestamp);
      setAppState('report');

      toast({
        title: "Report Generated",
        description: "Your health assessment is ready!",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isRateLimited = errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED');
      
      toast({
        title: isRateLimited ? "Rate Limited" : "Generation Failed",
        description: isRateLimited 
          ? "Too many requests. Please wait a moment and try again." 
          : "Failed to generate your health report. Please try again.",
        variant: "destructive",
      });
      setAppState('assessment');
    }
  };

  const handleBackToHome = () => {
    setAppState('home');
    setCurrentReport('');
    setAssessmentData(null);
  };

  const handleBackFromAssessment = () => {
    setAppState('home');
  };

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

  return <HeroSection onStartAssessment={handleStartAssessment} />;
};

export default Index;
