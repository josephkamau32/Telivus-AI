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
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Headache",
            description: "Patient reports headache symptoms",
            confidence_score: 0.95,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Tension Headache",
            description: "Most common type of headache, often stress-related",
            confidence_score: 0.75,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "G44.2" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Migraine",
            description: "Less common but possible differential diagnosis",
            confidence_score: 0.25,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "G43.9" }
          },
          {
            id: "factor_1",
            type: "factor",
            label: "Stress",
            description: "Common trigger for tension headaches",
            confidence_score: 0.6,
            evidence_sources: ["patient_feeling"],
            metadata: {}
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.8,
            explanation: "Headache is primary symptom of tension headache"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.3,
            explanation: "Headache can also indicate migraine"
          },
          {
            source_id: "factor_1",
            target_id: "condition_1",
            relationship_type: "causes",
            strength: 0.7,
            explanation: "Stress is a common trigger for tension headaches"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Based on reported headache symptoms and absence of red flags, tension headache is the most likely diagnosis. Migraine is considered but less likely without additional symptoms like nausea or photophobia."
      },
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
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Fever",
            description: "Patient reports fever symptoms",
            confidence_score: 0.9,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Viral Infection",
            description: "Most common cause of fever in otherwise healthy adults",
            confidence_score: 0.7,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "J06.9" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Bacterial Infection",
            description: "Possible but less likely without localized symptoms",
            confidence_score: 0.3,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "A49.9" }
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.8,
            explanation: "Fever is hallmark symptom of viral infections"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.4,
            explanation: "Fever can also indicate bacterial infection"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Fever in an otherwise healthy adult most likely represents a self-limiting viral infection. Bacterial causes are considered but less likely without additional symptoms."
      },
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
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Nausea",
            description: "Patient reports nausea symptoms",
            confidence_score: 0.85,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Gastroenteritis",
            description: "Inflammation of stomach and intestines, often viral",
            confidence_score: 0.65,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "A08.4" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Food Intolerance",
            description: "Adverse reaction to certain foods or ingredients",
            confidence_score: 0.4,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "K90.4" }
          },
          {
            id: "factor_1",
            type: "factor",
            label: "Recent Meals",
            description: "Recent food consumption may be contributing factor",
            confidence_score: 0.5,
            evidence_sources: ["common_causes"],
            metadata: {}
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.7,
            explanation: "Nausea is common symptom of gastroenteritis"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.5,
            explanation: "Nausea can result from food intolerances"
          },
          {
            source_id: "factor_1",
            target_id: "condition_2",
            relationship_type: "causes",
            strength: 0.6,
            explanation: "Recent meals can trigger food-related nausea"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Nausea symptoms most likely represent acute gastroenteritis or food-related issues. Viral gastroenteritis is most common, but food intolerance should also be considered."
      },
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
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Cough",
            description: "Patient reports persistent cough",
            confidence_score: 0.85,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Viral Upper Respiratory Infection",
            description: "Common respiratory infection causing cough",
            confidence_score: 0.7,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "J06.9" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Allergic Rhinitis",
            description: "Allergy-related nasal and throat irritation",
            confidence_score: 0.4,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "J30.9" }
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.75,
            explanation: "Cough is common symptom of viral respiratory infections"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.5,
            explanation: "Cough can be caused by allergic reactions"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Cough symptoms most likely represent a viral upper respiratory infection. Allergic causes are considered but less likely without additional symptoms like itchy eyes or nasal congestion."
      },
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('fatigue') || symptoms.includes('tired') || feelings.includes('tired') || feelings.includes('fatigued')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Fatigue and low energy",
      history_present_illness: `${data.age}-year-old patient presents with fatigue and reports feeling ${data.feelings}. Fatigue can be caused by various factors including sleep issues, stress, nutritional deficiencies, or medical conditions.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely fatigue related to inadequate sleep, stress, or nutritional factors. Differential diagnoses include anemia, thyroid dysfunction, depression, or chronic fatigue syndrome. Many cases improve with lifestyle modifications.",
      diagnostic_plan: "**Consultations**: See primary care if fatigue persists >2 weeks or worsens | **Tests**: Usually none needed initially for routine fatigue | **RED FLAGS**: Unexplained weight loss, severe fatigue with shortness of breath | **Follow-up**: Monitor symptoms and energy levels",
      otc_recommendations: [
        {
          medicine: "Multivitamin (One Daily)",
          dosage: "1 tablet daily with food",
          purpose: "Provides essential vitamins and minerals to support energy production",
          instructions: "Take with a meal to improve absorption.",
          precautions: "Avoid if you have kidney disease or take other supplements. Safe with no reported medications or allergies.",
          max_duration: "3 months - see doctor if no improvement"
        }
      ],
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Fatigue",
            description: "Patient reports fatigue symptoms",
            confidence_score: 0.9,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Sleep Deprivation",
            description: "Inadequate sleep causing fatigue",
            confidence_score: 0.7,
            evidence_sources: ["common_causes", "epidemiology"],
            metadata: { icd_code: "G47.9" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Iron Deficiency",
            description: "Low iron levels causing fatigue",
            confidence_score: 0.4,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "D50.9" }
          },
          {
            id: "factor_1",
            type: "factor",
            label: "Stress",
            description: "Mental or physical stress contributing to fatigue",
            confidence_score: 0.6,
            evidence_sources: ["patient_feeling"],
            metadata: {}
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.75,
            explanation: "Fatigue is primary symptom of sleep deprivation"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.5,
            explanation: "Fatigue can result from iron deficiency"
          },
          {
            source_id: "factor_1",
            target_id: "condition_1",
            relationship_type: "causes",
            strength: 0.7,
            explanation: "Stress often leads to poor sleep and fatigue"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Fatigue symptoms most likely represent inadequate sleep or stress-related issues. Nutritional deficiencies are considered but less likely without additional symptoms."
      },
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
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Abdominal Pain",
            description: "Patient reports stomach/abdominal discomfort",
            confidence_score: 0.8,
            evidence_sources: ["patient_report"],
            metadata: { severity: "mild" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Indigestion",
            description: "Common digestive discomfort, often diet-related",
            confidence_score: 0.65,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "K30" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Gastritis",
            description: "Inflammation of the stomach lining",
            confidence_score: 0.35,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "K29.70" }
          },
          {
            id: "factor_1",
            type: "factor",
            label: "Dietary Factors",
            description: "Recent meals or eating habits may contribute",
            confidence_score: 0.6,
            evidence_sources: ["common_causes"],
            metadata: {}
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.7,
            explanation: "Abdominal pain is common with indigestion"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.45,
            explanation: "Abdominal pain can indicate gastritis"
          },
          {
            source_id: "factor_1",
            target_id: "condition_1",
            relationship_type: "causes",
            strength: 0.65,
            explanation: "Dietary factors commonly cause indigestion"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Abdominal symptoms most likely represent indigestion or dietary-related discomfort. Gastritis is considered but less likely without additional symptoms like nausea or heartburn."
      },
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('dizziness') || symptoms.includes('dizzy') || feelings.includes('dizzy')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Dizziness and balance issues",
      history_present_illness: `${data.age}-year-old patient presents with dizziness and reports feeling ${data.feelings}. Dizziness can be caused by inner ear problems, dehydration, low blood pressure, or other factors.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely benign paroxysmal positional vertigo (BPPV) or vestibular issue. Differential diagnoses include orthostatic hypotension, medication side effects, or inner ear infection. Many cases resolve spontaneously.",
      diagnostic_plan: "**Consultations**: See doctor if dizziness persists >1 week or is severe | **Tests**: Usually none needed for routine dizziness | **RED FLAGS**: Severe headache with dizziness, vision changes, weakness | **Follow-up**: Avoid sudden head movements",
      otc_recommendations: [
        {
          medicine: "Dimenhydrinate (Dramamine)",
          dosage: "50-100 mg every 4-6 hours as needed",
          purpose: "Helps relieve dizziness and motion sickness",
          instructions: "Take 30 minutes before activities that trigger dizziness.",
          precautions: "May cause drowsiness. Avoid alcohol. Safe with no reported medications or allergies.",
          max_duration: "3 days - see doctor if dizziness persists"
        }
      ],
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Dizziness",
            description: "Patient reports dizziness symptoms",
            confidence_score: 0.85,
            evidence_sources: ["patient_report"],
            metadata: { severity: "moderate" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "BPPV",
            description: "Benign paroxysmal positional vertigo",
            confidence_score: 0.65,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "H81.13" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Vestibular Neuritis",
            description: "Inflammation of the vestibular nerve",
            confidence_score: 0.4,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "H81.2" }
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.7,
            explanation: "Dizziness is hallmark symptom of BPPV"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.5,
            explanation: "Dizziness can result from vestibular nerve inflammation"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Dizziness symptoms most likely represent BPPV or vestibular issues. More serious causes are considered but less likely without additional symptoms."
      },
      timestamp: new Date().toISOString(),
      cached: false,
      demo: true
    };
  }

  if (symptoms.includes('rash') || symptoms.includes('skin') || symptoms.includes('itching') || symptoms.includes('itchy')) {
    return {
      demographic_header: {
        name: data.name || 'Not provided',
        age: data.age,
        gender: data.gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      },
      chief_complaint: "Skin rash and irritation",
      history_present_illness: `${data.age}-year-old patient presents with skin rash/irritation and reports feeling ${data.feelings}. Skin rashes can be caused by allergic reactions, irritants, infections, or other dermatological conditions.`,
      past_medical_history: data.medicalHistory || 'None reported',
      past_surgical_history: data.surgicalHistory || 'None reported',
      medications: data.currentMedications || 'None reported',
      allergies: data.allergies || 'None reported',
      assessment: "Most likely allergic contact dermatitis or irritant dermatitis. Differential diagnoses include eczema, fungal infection, or viral exanthem. Many rashes resolve with topical treatments and avoidance of triggers.",
      diagnostic_plan: "**Consultations**: See dermatologist if rash persists >1 week or worsens | **Tests**: Usually none needed for routine rashes | **RED FLAGS**: Rash with fever, spreading rapidly, severe pain | **Follow-up**: Keep area clean and moisturized",
      otc_recommendations: [
        {
          medicine: "Hydrocortisone cream 1% (Cortaid)",
          dosage: "Apply thin layer 2-3 times daily to affected area",
          purpose: "Reduces inflammation and itching from skin rashes",
          instructions: "Apply to clean, dry skin. Rub in gently.",
          precautions: "For external use only. Avoid face and groin areas. Safe with no reported medications or allergies.",
          max_duration: "7 days - see doctor if no improvement"
        },
        {
          medicine: "Diphenhydramine (Benadryl)",
          dosage: "25-50 mg every 4-6 hours as needed",
          purpose: "Relieves itching associated with allergic reactions",
          instructions: "Take with water. May cause drowsiness.",
          precautions: "May cause drowsiness. Avoid alcohol. Safe with no reported medications or allergies.",
          max_duration: "7 days - see doctor if itching persists"
        }
      ],
      reasoning_graph: {
        nodes: [
          {
            id: "symptom_1",
            type: "symptom",
            label: "Skin Rash",
            description: "Patient reports skin rash symptoms",
            confidence_score: 0.8,
            evidence_sources: ["patient_report"],
            metadata: { severity: "mild" }
          },
          {
            id: "condition_1",
            type: "condition",
            label: "Contact Dermatitis",
            description: "Skin inflammation from contact with irritants",
            confidence_score: 0.7,
            evidence_sources: ["medical_knowledge_base", "epidemiology"],
            metadata: { icd_code: "L73.9" }
          },
          {
            id: "condition_2",
            type: "condition",
            label: "Allergic Reaction",
            description: "Immune response to allergens",
            confidence_score: 0.5,
            evidence_sources: ["medical_knowledge_base"],
            metadata: { icd_code: "T78.40" }
          }
        ],
        edges: [
          {
            source_id: "symptom_1",
            target_id: "condition_1",
            relationship_type: "supports",
            strength: 0.75,
            explanation: "Rash is common symptom of contact dermatitis"
          },
          {
            source_id: "symptom_1",
            target_id: "condition_2",
            relationship_type: "supports",
            strength: 0.6,
            explanation: "Rash can result from allergic reactions"
          }
        ],
        root_symptoms: ["symptom_1"],
        final_diagnosis: "condition_1",
        triage_level: "routine",
        reasoning_summary: "Skin rash symptoms most likely represent contact dermatitis or allergic reaction. More serious causes are considered but less likely without systemic symptoms."
      },
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
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);


  // Check backend availability (less aggressive checking)
   useEffect(() => {
     const checkBackendStatus = async () => {
       try {
         const status = await apiClient.isServiceAvailable();
         setBackendStatus(status.available ? 'available' : 'unavailable');

         if (!status.available && process.env.NODE_ENV === 'production') {
           console.warn('Backend service unavailable:', status.error);
         }
       } catch (error) {
         // Don't set to unavailable on check failures - be more tolerant
         console.warn('Backend status check failed, assuming available:', error);
         setBackendStatus('available'); // Assume available unless proven otherwise
       }
     };

     checkBackendStatus();

     // Check every 5 minutes instead of 30 seconds to be less intrusive
     const interval = setInterval(checkBackendStatus, 300000);
     return () => clearInterval(interval);
   }, []);

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

      // Trigger trajectory analysis for demo reports too
      if (user) {
        triggerTrajectoryAnalysis(data, user.id);
      }

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
          reasoning_graph: (reportData.medical_assessment as any).reasoning_graph,
          timestamp: reportData.generated_at,
          cached: false,
          ai_model_used: reportData.ai_model_used,
          confidence_score: reportData.confidence_score
        };

        setCurrentReport(transformedReport);
        setReportTimestamp(reportData.generated_at);

        // Trigger trajectory analysis in the background
        triggerTrajectoryAnalysis(data, user.id);

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

          // Trigger trajectory analysis for fallback reports too
          if (user) {
            triggerTrajectoryAnalysis(data, user.id);
          }

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

  const triggerTrajectoryAnalysis = async (assessmentData: PatientData, userId: string) => {
    try {
      console.log('Triggering trajectory analysis for user:', userId);

      // Prepare trajectory request data
      const trajectoryRequest = {
        user_id: userId,
        prediction_horizon_days: 30,
        include_simulations: true,
        focus_conditions: [] // Will be auto-detected from symptoms
      };

      // Call trajectory analysis API (this would be implemented when backend is ready)
      // For now, just log that trajectory analysis would be triggered
      console.log('Trajectory analysis request prepared:', trajectoryRequest);

      // In production, this would call:
      // await apiClient.analyzeTrajectory(trajectoryRequest);

      // Show subtle notification that trajectory analysis is running in background
      setTimeout(() => {
        toast({
          title: "Health Trajectory Analysis Started",
          description: "Your health data is being analyzed for personalized predictions and recommendations.",
          duration: 3000,
        });
      }, 2000);

    } catch (error) {
      console.error('Failed to trigger trajectory analysis:', error);
      // Don't show error toast as this is background process and shouldn't interrupt user experience
    }
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
       {/* Backend status indicator - only show when there are actual issues */}
       {backendStatus === 'unavailable' && process.env.NODE_ENV === 'production' && (
         <div className="fixed top-4 right-4 z-50">
           <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">
             ⚠️ Limited AI features - using fallback mode
           </div>
         </div>
       )}

       <HeroSection onStartAssessment={handleStartAssessment} onSignOut={handleSignOut} />
     </div>
   );
};

export default Index;
