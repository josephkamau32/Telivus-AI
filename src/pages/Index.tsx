import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/HeroSection';
import { SymptomFlow, type PatientData } from '@/components/SymptomFlow';
import { MedicalReport } from '@/components/MedicalReport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';

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

      console.log('Calling Python backend for health assessment...');

      // Call the new Python backend API
      const reportData = await apiClient.generateHealthReport(data);

      console.log('Successfully received report from Python backend:', reportData);

      // Transform the response to match the expected format for the MedicalReport component
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

    } catch (error) {
      console.error('Error generating report from Python backend:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('Failed to fetch');
      const isValidationError = errorMessage.includes('Validation failed') || errorMessage.includes('required');

      let title = "Generation Failed";
      let description = "Failed to generate your health report. Please try again.";

      if (isNetworkError) {
        title = "Connection Error";
        description = "Unable to connect to the AI service. Please check your internet connection and try again.";
      } else if (isValidationError) {
        title = "Validation Error";
        description = errorMessage;
      } else {
        // For any other error, try to provide a demo report as fallback
        console.log('Attempting to provide demo report due to backend error:', errorMessage);
        const demoReport = generateDemoReport(data);
        if (demoReport) {
          setCurrentReport(demoReport);
          setReportTimestamp(new Date().toISOString());
          setAppState('report');

          toast({
            title: "Demo Report Ready",
            description: "Due to service issues, here's a demo report based on common symptoms. The AI service will be available soon.",
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
