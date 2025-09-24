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

    try {
      const { data: reportData, error } = await supabase.functions.invoke('generate-medical-report', {
        body: data
      });

      if (error) {
        throw new Error(error.message);
      }

      const { report, timestamp } = reportData;
      
      // Save to local storage
      addReport({
        timestamp,
        userInfo: data,
        report,
      });

      setCurrentReport(report);
      setReportTimestamp(timestamp);
      setAppState('report');

      toast({
        title: "Report Generated",
        description: "Your health assessment is ready!",
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate your health report. Please try again.",
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Generating Your Report</h2>
          <p className="text-muted-foreground">AI is analyzing your symptoms and creating personalized recommendations...</p>
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
