import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow, type PatientData } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type AppState = 'home' | 'assessment' | 'report' | 'loading';

// Demo report generator for instant delivery when service is unavailable
const generateDemoReport = (data: PatientData): any | null => {
  const symptoms = data.symptoms.map(s => s.toLowerCase());
  const feelings = data.feelings.toLowerCase();

  // Check for common symptom patterns
  if (symptoms.includes('headache') || symptoms.includes('migraine') || feelings.includes('headache')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Headache with discomfort",
      history_present_illness: `${data.age}-year-old patient presents with headache. The patient reports feeling ${data.feelings}. This appears to be a common tension headache based on the reported symptoms.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely tension-type headache, which is very common. Differential diagnoses include migraine or cluster headache. The symptoms are consistent with primary headache disorder.",
      diagnostic_plan: "**Consultations**: See primary care if headaches become frequent | **Tests**: Usually none needed for routine headaches | **RED FLAGS**: Severe sudden headache, vision changes, weakness | **Follow-up**: Return if headache worsens or new symptoms appear",
      otc_recommendations: [
        {
          medicine: "Acetaminophen (Tylenol)",
          dosage: "500-1000 mg every 4-6 hours as needed, max 3000 mg/day",
          purpose: "Relieves headache pain",
          instructions: "Take with plenty of water. Do not exceed maximum daily dose.",
          precautions: "Avoid if you have liver disease. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if no improvement"
        },
        {
          medicine: "Ibuprofen (Advil, Motrin)",
          dosage: "200-400 mg every 4-6 hours as needed, max 1200 mg/day",
          purpose: "Reduces inflammation and relieves headache pain",
          instructions: "Take with food to avoid stomach upset.",
          precautions: "Avoid if allergic to NSAIDs or have stomach ulcers. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if no improvement"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('fever') || feelings.includes('fever') || feelings.includes('hot')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Fever with constitutional symptoms",
      history_present_illness: `${data.age}-year-old patient presents with fever and reports feeling ${data.feelings}. This is commonly seen with viral infections or other temporary illnesses.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely viral infection causing fever. Differential diagnoses include bacterial infection or other causes. Fever is the body's natural response to infection.",
      diagnostic_plan: "**Consultations**: See doctor if fever >103°F or lasts >3 days | **Tests**: Usually none needed for routine fevers | **RED FLAGS**: High fever with severe headache, stiff neck, rash | **Follow-up**: Monitor temperature and symptoms",
      otc_recommendations: [
        {
          medicine: "Acetaminophen (Tylenol)",
          dosage: "500-1000 mg every 4-6 hours as needed, max 3000 mg/day",
          purpose: "Reduces fever and relieves discomfort",
          instructions: "Take with plenty of water. Monitor temperature regularly.",
          precautions: "Avoid if you have liver disease. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if fever persists"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('nausea') || symptoms.includes('vomiting') || feelings.includes('nauseous')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Nausea and gastrointestinal discomfort",
      history_present_illness: `${data.age}-year-old patient presents with nausea and reports feeling ${data.feelings}. This could be related to various causes including gastrointestinal issues, medication side effects, or other temporary conditions.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely acute gastroenteritis or medication-related nausea. Differential diagnoses include viral infection, food intolerance, or medication side effects. Nausea is a common symptom with many possible causes.",
      diagnostic_plan: "**Consultations**: See primary care if nausea persists >48 hours | **Tests**: Usually none needed for routine nausea | **RED FLAGS**: Severe dehydration, blood in vomit, severe abdominal pain | **Follow-up**: Monitor symptoms and stay hydrated",
      otc_recommendations: [
        {
          medicine: "Bismuth subsalicylate (Pepto-Bismol)",
          dosage: "30 mL (2 tablespoons) every 30-60 minutes as needed, max 240 mL/day",
          purpose: "Relieves nausea, heartburn, indigestion, and diarrhea",
          instructions: "Take with plenty of water. Shake well before use.",
          precautions: "Avoid if allergic to salicylates. May cause temporary black tongue. Safe with no reported medications or allergies.",
          max_duration: "2 days - see doctor if no improvement"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('sore throat') || symptoms.includes('throat') || feelings.includes('throat')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Sore throat and throat discomfort",
      history_present_illness: `${data.age}-year-old patient presents with sore throat and reports feeling ${data.feelings}. Sore throat is commonly caused by viral infections, post-nasal drip, or irritation.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely viral pharyngitis or upper respiratory infection. Differential diagnoses include bacterial infection, allergies, or irritant exposure. Sore throat often resolves on its own with supportive care.",
      diagnostic_plan: "**Consultations**: See doctor if sore throat lasts >1 week or worsens | **Tests**: Usually none needed for routine sore throat | **RED FLAGS**: Difficulty swallowing, high fever, rash | **Follow-up**: Rest voice and stay hydrated",
      otc_recommendations: [
        {
          medicine: "Acetaminophen (Tylenol)",
          dosage: "500-1000 mg every 4-6 hours as needed, max 3000 mg/day",
          purpose: "Relieves sore throat pain and reduces fever if present",
          instructions: "Take with plenty of water. Do not exceed maximum daily dose.",
          precautions: "Avoid if you have liver disease. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if sore throat persists"
        },
        {
          medicine: "Benzocaine lozenges (Cepacol)",
          dosage: "1 lozenge every 2 hours as needed",
          purpose: "Temporarily relieves sore throat pain",
          instructions: "Allow lozenge to dissolve slowly in mouth.",
          precautions: "For adults and children 3 years and older. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if no improvement"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('cough') || symptoms.includes('coughing')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Persistent cough",
      history_present_illness: `${data.age}-year-old patient presents with cough and reports feeling ${data.feelings}. Cough can be caused by various factors including respiratory infections, allergies, or irritants.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely acute viral upper respiratory infection. Differential diagnoses include allergies, asthma, or post-nasal drip. Cough is often self-limiting and resolves with supportive care.",
      diagnostic_plan: "**Consultations**: See doctor if cough lasts >3 weeks or worsens | **Tests**: Usually none needed for acute cough | **RED FLAGS**: Shortness of breath, chest pain, blood in sputum | **Follow-up**: Stay hydrated and rest",
      otc_recommendations: [
        {
          medicine: "Dextromethorphan (Delsym)",
          dosage: "10-20 mg every 4 hours as needed",
          purpose: "Suppresses dry cough reflex",
          instructions: "Measure dose carefully. Do not exceed recommended dose.",
          precautions: "May cause drowsiness. Avoid alcohol. Safe with no reported medications or allergies.",
          max_duration: "7 days - see doctor if cough persists"
        },
        {
          medicine: "Guaifenesin (Mucinex)",
          dosage: "200-400 mg every 4 hours as needed",
          purpose: "Helps loosen mucus in respiratory tract",
          instructions: "Take with plenty of water. May be taken with or without food.",
          precautions: "May cause stomach upset. Safe with no reported medications or allergies.",
          max_duration: "7 days - see doctor if no improvement"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('stomach') || symptoms.includes('abdominal') || symptoms.includes('pain') || feelings.includes('stomach')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Abdominal discomfort and stomach pain",
      history_present_illness: `${data.age}-year-old patient presents with stomach/abdominal discomfort and reports feeling ${data.feelings}. Abdominal pain can have many causes including indigestion, gas, or mild gastrointestinal issues.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely indigestion, gas, or mild gastrointestinal discomfort. Differential diagnoses include gastritis, irritable bowel syndrome, or dietary factors. Many cases resolve with simple remedies.",
      diagnostic_plan: "**Consultations**: See doctor if pain persists >1 week or worsens | **Tests**: Usually none needed for routine abdominal discomfort | **RED FLAGS**: Severe pain, vomiting blood, black stools | **Follow-up**: Monitor symptoms and avoid trigger foods",
      otc_recommendations: [
        {
          medicine: "Simethicone (Gas-X)",
          dosage: "125 mg after meals and at bedtime as needed",
          purpose: "Relieves gas and bloating in the stomach and intestines",
          instructions: "Take after meals to help prevent gas buildup.",
          precautions: "Safe for most people. No known serious interactions. Safe with no reported medications or allergies.",
          max_duration: "2 weeks - see doctor if symptoms persist"
        },
        {
          medicine: "Famotidine (Pepcid)",
          dosage: "10-20 mg every 12 hours as needed",
          purpose: "Reduces stomach acid to relieve heartburn and indigestion",
          instructions: "Take with plenty of water. May take 15-60 minutes to work.",
          precautions: "Avoid if allergic to famotidine. Consult doctor if you have kidney disease. Safe with no reported medications or allergies.",
          max_duration: "2 weeks - see doctor if no improvement"
        }
      ],
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  // Return null if no matching demo report
  return null;
};

// Fallback report generator for when AI fails and no demo is available
const generateFallbackReport = (data: PatientData): any | null => {
  const symptoms = data.symptoms.map(s => s.toLowerCase());
  const feelings = data.feelings.toLowerCase();

  return {
    demographic_header: {
      name: data.name || 'Not provided',
      age: data.age,
      gender: data.gender || 'Not provided',
      date: new Date().toISOString().split('T')[0]
    },
    chief_complaint: `General health concerns with ${symptoms.join(', ')}`,
    history_present_illness: `${data.age}-year-old patient presents with ${symptoms.join(', ')} and reports feeling ${data.feelings}. A comprehensive evaluation is recommended to determine the underlying cause(s) and appropriate management.`,
    past_medical_history: data.medicalHistory || 'None reported',
    past_surgical_history: data.surgicalHistory || 'None reported',
    medications: data.currentMedications || 'None reported',
    allergies: data.allergies || 'None reported',
    assessment: `Patient reports experiencing ${symptoms.join(', ')} with associated feeling of ${data.feelings}. This constellation of symptoms warrants professional medical evaluation to identify contributing factors and determine appropriate treatment. Multiple potential causes should be considered including acute illness, chronic conditions, medication effects, or lifestyle factors.`,
    diagnostic_plan: `**Consultations**: Schedule appointment with primary care physician within 1-2 weeks\n**Tests**: Basic metabolic panel, complete blood count, and symptom-specific testing as indicated\n**RED FLAGS**: Severe pain, unexplained weight loss, persistent fever, neurological symptoms\n**Follow-up**: Regular monitoring of symptoms and follow-up with healthcare provider`,
    otc_recommendations: [
      {
        medicine: "Acetaminophen (Tylenol)",
        dosage: "500-1000 mg every 4-6 hours as needed, max 3000 mg/day",
        purpose: "General pain relief and fever reduction if present",
        instructions: "Take with plenty of water. Do not exceed maximum daily dose.",
        precautions: "Avoid if you have liver disease or are taking other medications. Safe with no reported medications or allergies.",
        max_duration: "3-5 days - see doctor if symptoms persist"
      }
    ],
    timestamp: new Date().toISOString(),
    cached: false,
    demo: true
  };
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [appState, setAppState] = useState<AppState>('home');
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportTimestamp, setReportTimestamp] = useState<string>('');
  const [assessmentData, setAssessmentData] = useState<PatientData | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showTutorial, setShowTutorial] = useState(false);
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // Check if user has completed onboarding tutorial
  useEffect(() => {
    if (user && !isLoading) {
      const tutorialCompleted = localStorage.getItem(`telivus-tutorial-${user.id}`);
      if (!tutorialCompleted) {
        // Show tutorial for new users after a brief delay
        const timer = setTimeout(() => {
          setShowTutorial(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isLoading]);

  // Check backend availability
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const status = await apiClient.isServiceAvailable();
        setBackendStatus(status.available ? 'available' : 'unavailable');

        if (!status.available && process.env.NODE_ENV === 'production') {
          console.warn('Backend service unavailable:', status.error);
        }
      } catch (error) {
        setBackendStatus('unavailable');
        console.error('Failed to check backend status:', error);
      }
    };

    checkBackendStatus();

    // Check every 30 seconds in production
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleTutorialComplete = () => {
    if (user) {
      localStorage.setItem(`telivus-tutorial-${user.id}`, 'completed');
    }
    setShowTutorial(false);
    toast({
      title: "Welcome to Telivus AI! 🎉",
      description: "You're all set to explore your health insights.",
    });
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  const handleStartAssessment = () => {
    setAppState('assessment');
  };

  const handleAssessmentComplete = async (data: PatientData) => {
    setAppState('loading');
    setAssessmentData(data);

    // Client-side validation
    const validationErrors: string[] = [];
    if (!data.feelings?.trim()) validationErrors.push('Feeling description is required');
    if (!data.symptoms?.length) validationErrors.push('At least one symptom is required');
    if (!data.age || data.age < 0 || data.age > 130) validationErrors.push('Age must be between 0 and 130');

    if (validationErrors.length > 0) {
      toast({
        title: "Please Complete All Fields",
        description: validationErrors.join('. '),
        variant: "destructive",
      });
      setAppState('assessment');
      return;
    }

    // Check for instant demo report first (for common symptoms)
    const demoReport = generateDemoReport(data);
    if (demoReport) {
      console.log('Using instant demo report for common symptoms');
      setCurrentReport(demoReport);
      setReportTimestamp(new Date().toISOString());
      setAppState('report');

      toast({
        title: "Health Report Ready",
        description: "Instant assessment completed based on your symptoms.",
      });
      return;
    }

    // For uncommon symptoms, try AI backend with retry logic
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        console.log(`Attempting AI report generation (attempt ${retryCount + 1}/${maxRetries + 1})...`);

        // Call the Python backend API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const reportData = await apiClient.generateHealthReport(data);

        clearTimeout(timeoutId);

        console.log('Successfully received AI report:', reportData);

        // Transform the response to match the expected format
        const transformedReport = {
          demographic_header: {
            name: reportData.patient_info.name || 'Not provided',
            age: reportData.patient_info.age,
            gender: reportData.patient_info.gender || 'Not provided',
            date: new Date(reportData.generated_at).toISOString().split('T')[0]
          },
          chief_complaint: reportData.medical_assessment.chief_complaint,
          history_present_illness: reportData.medical_assessment.history_present_illness,
          past_medical_history: data.medicalHistory || 'None reported',
          past_surgical_history: data.surgicalHistory || 'None reported',
          medications: data.currentMedications || 'None reported',
          allergies: data.allergies || 'None reported',
          assessment: reportData.medical_assessment.assessment,
          diagnostic_plan: reportData.medical_assessment.diagnostic_plan.follow_up ||
                           `**Consultations**: ${reportData.medical_assessment.diagnostic_plan.consultations?.join(', ') || 'None recommended'}\n**Tests**: ${reportData.medical_assessment.diagnostic_plan.tests?.join(', ') || 'None recommended'}\n**RED FLAGS**: ${reportData.medical_assessment.diagnostic_plan.red_flags?.join(', ') || 'None identified'}\n**Follow-up**: ${reportData.medical_assessment.diagnostic_plan.follow_up || 'As needed'}`,
          otc_recommendations: reportData.medical_assessment.otc_recommendations,
          lifestyle_recommendations: reportData.medical_assessment.lifestyle_recommendations,
          timestamp: reportData.generated_at,
          cached: false,
          ai_model_used: reportData.ai_model_used,
          confidence_score: reportData.confidence_score
        };

        setCurrentReport(transformedReport);
        setReportTimestamp(reportData.generated_at);
        setAppState('report');

        toast({
          title: "AI Health Report Ready",
          description: `Generated using ${reportData.ai_model_used} with ${reportData.confidence_score ? Math.round(reportData.confidence_score * 100) + '%' : 'high'} confidence.`,
        });
        return;

      } catch (error) {
        console.error(`AI report generation attempt ${retryCount + 1} failed:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('Failed to fetch') || errorMessage.includes('abort');
        const isTimeoutError = errorMessage.includes('abort') || errorMessage.includes('timeout');
        const isServerError = errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504');

        if (retryCount < maxRetries && (isNetworkError || isTimeoutError || isServerError)) {
          retryCount++;
          console.log(`Retrying in ${retryCount * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          continue;
        }

        // All retries failed - provide comprehensive error handling
        let title = "Report Generation Failed";
        let description = "Unable to generate your personalized health report.";

        if (isNetworkError) {
          title = "Connection Issue";
          description = "Please check your internet connection and try again.";
        } else if (isTimeoutError) {
          title = "Request Timeout";
          description = "The AI service is taking too long to respond. Please try again.";
        } else if (isServerError) {
          title = "Service Temporarily Unavailable";
          description = "Our AI service is experiencing issues. Please try again in a few minutes.";
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          title = "Service Limit Reached";
          description = "AI service quota exceeded. Using instant assessment instead.";
        } else {
          title = "Unexpected Error";
          description = "An unexpected error occurred. Using instant assessment instead.";
        }

        // Try to provide a basic fallback report for any symptoms
        const fallbackReport = generateFallbackReport(data);
        if (fallbackReport) {
          setCurrentReport(fallbackReport);
          setReportTimestamp(new Date().toISOString());
          setAppState('report');

          toast({
            title: "Basic Assessment Ready",
            description: "Due to technical issues, here's a basic assessment. For detailed analysis, please try again later.",
          });
          return;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
        setAppState('assessment');
        return;
      }
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center max-w-lg mx-auto p-8 bg-background/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-primary/10">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Generating Your Health Report</h2>
          <p className="text-muted-foreground mb-6 text-lg">Our AI is analyzing your symptoms with medical precision...</p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Validating your health information</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <span className="text-sm font-medium">Checking for cached similar cases</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
              <span className="text-sm font-medium">AI analyzing symptoms and medical history</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.9s'}}></div>
              <span className="text-sm font-medium">Generating personalized recommendations</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '1.2s'}}></div>
              <span className="text-sm font-medium">Finalizing your comprehensive report</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p>This usually takes 10-20 seconds. Please don't close this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'assessment') {
    return (
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Assessment Error</h2>
                <p className="text-muted-foreground mb-4">
                  There was a problem with the symptom assessment. Please try again.
                </p>
                <Button onClick={handleBackFromAssessment}>
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      >
        <SymptomFlow
          onComplete={handleAssessmentComplete}
          onBack={handleBackFromAssessment}
        />
      </ErrorBoundary>
    );
  }

  if (appState === 'report' && assessmentData) {
    return (
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Report Display Error</h2>
                <p className="text-muted-foreground mb-4">
                  There was a problem displaying your report. Your data is safe.
                </p>
                <Button onClick={handleBackToHome}>
                  Go Back Home
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      >
        <MedicalReport
          report={currentReport}
          userInfo={assessmentData}
          timestamp={reportTimestamp}
          onBackToHome={handleBackToHome}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="relative">
      {/* Backend status indicator */}
      {backendStatus !== 'available' && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            backendStatus === 'checking'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {backendStatus === 'checking' ? 'Checking services...' : 'Service unavailable'}
          </div>
        </div>
      )}

      <HeroSection onStartAssessment={handleStartAssessment} onSignOut={handleSignOut} />

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
};

export default Index;
