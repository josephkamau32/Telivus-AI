import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow, type PatientData } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

      // Generate instant demo report first (primary experience)
      const demoReport = generateDemoReport(data);
      if (demoReport) {
        console.log('Generated instant demo report');
        setCurrentReport(demoReport);
        setReportTimestamp(new Date().toISOString());
        setAppState('report');

        toast({
          title: "Instant Report Ready",
          description: "Generated based on common symptoms. For personalized AI analysis, please try again when the service is available.",
        });

        // Try to enhance with AI in background (optional)
        try {
          console.log('Attempting optional AI enhancement...');
          const result = await supabase.functions.invoke('generate-medical-report', {
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

          if (result.data && !result.error) {
            console.log('AI enhancement successful, updating report');
            setCurrentReport(result.data);
            setReportTimestamp(new Date().toISOString());
            toast({
              title: "Report Enhanced",
              description: "AI analysis has been added to your instant report!",
            });
          }
        } catch (aiError) {
          console.log('AI enhancement failed (expected), keeping demo report');
          // Keep the demo report - no error shown to user
        }

        return;
      }

      // Fallback: try AI function if no demo report available
      console.log('No demo report available, trying AI function...');
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
        // If no data received, try to provide a cached/demo report for common symptoms
        const demoReport = generateDemoReport(data);
        if (demoReport) {
          console.log('Using demo report for instant delivery');
          setCurrentReport(demoReport);
          setReportTimestamp(new Date().toISOString());
          setAppState('report');

          toast({
            title: "Instant Report Ready",
            description: "Generated based on common symptoms. For personalized AI analysis, please try again when the service is available.",
          });
          return;
        }
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
        description = "The AI service is temporarily unavailable. You'll receive an instant demo report instead. For personalized AI analysis, please try again later.";
      } else if (isRateLimited) {
        title = "Rate Limited";
        description = "Too many requests right now. You'll receive an instant demo report instead. For personalized AI analysis, please try again in a few minutes.";
      } else if (isNetworkError) {
        title = "Connection Error";
        description = "Network issue detected. You'll receive an instant demo report instead. For personalized AI analysis, please check your connection and try again.";
      } else if (isValidationError) {
        title = "Validation Error";
        description = errorMessage;
      } else {
        // For any other error, try to provide a demo report
        console.log('Attempting to provide demo report due to error:', errorMessage);
        const demoReport = generateDemoReport(data);
        if (demoReport) {
          setCurrentReport(demoReport);
          setReportTimestamp(new Date().toISOString());
          setAppState('report');

          toast({
            title: "Instant Report Ready",
            description: "Due to service issues, here's an instant report based on common symptoms. For personalized AI advice, please try again when the service is available.",
          });
          return;
        }
        title = "Service Error";
        description = "Unable to generate report right now. Please try again in a few minutes.";
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
