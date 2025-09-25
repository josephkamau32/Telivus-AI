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

const formatStructuredReport = (data: any): string => {
  let report = "# Health Assessment Report\n\n";
  
  if (data.possible_conditions && data.possible_conditions.length > 0) {
    report += "## Possible Conditions\n";
    data.possible_conditions.forEach((condition: any, index: number) => {
      report += `${index + 1}. **${condition.condition}** (${condition.probability} likelihood)\n`;
      report += `   ${condition.rationale}\n\n`;
    });
  }
  
  if (data.recommendations && data.recommendations.length > 0) {
    report += "## Recommendations\n";
    data.recommendations.forEach((rec: any, index: number) => {
      report += `${index + 1}. **${rec.category}**: ${rec.instruction}\n\n`;
    });
  }
  
  if (data.otc_medicines && data.otc_medicines.length > 0) {
    report += "## Wellness Suggestions\n";
    data.otc_medicines.forEach((med: any, index: number) => {
      report += `${index + 1}. **${med.name}**\n`;
      report += `   - Usage: ${med.dosage}\n`;
      report += `   - Instructions: ${med.instructions}\n`;
      if (med.contraindications) {
        report += `   - Note: ${med.contraindications}\n`;
      }
      report += "\n";
    });
  }
  
  if (data.red_flags && data.red_flags.length > 0) {
    report += "## Important Signs to Watch For\n";
    data.red_flags.forEach((flag: any, index: number) => {
      report += `${index + 1}. ${flag}\n`;
    });
    report += "\n";
  }
  
  if (data.confidence_scores) {
    report += "## Assessment Confidence\n";
    report += `- Overall Assessment: ${data.confidence_scores.overall_assessment}%\n`;
    report += `- Recommendations: ${data.confidence_scores.medication_recommendations}%\n\n`;
  }
  
  if (data.disclaimer) {
    report += "## Important Disclaimer\n";
    report += data.disclaimer + "\n";
  }
  
  return report;
};

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
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate report');
      }

      // Check if we have valid data
      if (!reportData) {
        throw new Error('No data received from the report generation service');
      }

      // Handle both structured JSON and text responses
      let report;
      if (reportData.text_report) {
        report = reportData.text_report;
      } else if (reportData.possible_conditions || reportData.educational_information) {
        // Format structured data as readable text
        report = formatStructuredReport(reportData);
        
        // Add fallback notice if applicable
        if (reportData.fallback_used) {
          report = `**⚠️ Notice: AI Service Temporarily Unavailable**\n\n${reportData.fallback_notice || 'This response was generated using our backup system.'}\n\n---\n\n${report}`;
        }
      } else {
        report = JSON.stringify(reportData, null, 2);
      }
      
      const timestamp = reportData.timestamp || new Date().toISOString();
      
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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isRateLimited = errorMessage.includes('429') || errorMessage.includes('RATE_LIMITED') || errorMessage.includes('quota exceeded');
      const isAPIKeyError = errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403');
      const isContentBlocked = errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('filtered');
      
      let title = "Generation Failed";
      let description = "Failed to generate your health report. Please try again.";
      
      if (isRateLimited) {
        title = "Service Temporarily Unavailable";
        description = "Too many requests. Please wait a moment and try again.";
      } else if (isAPIKeyError) {
        title = "Configuration Error";
        description = "The service is not properly configured. Please contact support.";
      } else if (isContentBlocked) {
        title = "Content Review Required";
        description = "Your request needs review. Please try rephrasing your symptoms or contact support.";
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
