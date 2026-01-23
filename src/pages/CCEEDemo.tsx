/**
 * CCEE Demo Page
 * 
 * Demonstrates the Clinical Confidence & Explainability Engine display
 * Shows how to integrate CCEE with health assessment results
 */

import { useState } from 'react';
import { CCEEDisplay } from '@/components/CCEEDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

// Mock CCEE data - in real app, this would come from the API
const mockCCEEData = {
    confidence_score: 82,
    confidence_level: "high",
    confidence_breakdown: {
        data_completeness: 0.9,
        symptom_signal_strength: 0.75,
        rag_relevance: 0.65,
        agent_agreement: 0.8,
        model_consistency: 1.0
    },
    evidence: [
        {
            symptom: "headache",
            supporting_sources: ["Headache Overview", "Migraine Guide"],
            confidence_contribution: 0.33
        },
        {
            symptom: "fever",
            supporting_sources: ["Fever Management", "Viral Infections"],
            confidence_contribution: 0.33
        }
    ],
    explanation_summary: "Assessment based on 3 reported symptoms with comprehensive medical details.",
    uncertainty_factors: [
        {
            category: "missing_data",
            description: "Limited additional context",
            impact: "Reduces confidence by approximately 10%",
            suggestion: "Share relevant details like recent activities"
        }
    ],
    suggested_data_improvements: [
        "Specify how long each symptom has been present"
    ],
    safety: {
        safety_level: "green" as const,
        safety_notes: "Assessment based on available information. Always consult healthcare provider for persistent symptoms.",
        triggered_rules: ["High confidence (82%), no emergency symptoms"],
        requires_immediate_care: false
    }
};

const mockCCEEDataAmber = {
    confidence_score: 65,
    confidence_level: "medium",
    confidence_breakdown: {
        data_completeness: 0.5,
        symptom_signal_strength: 0.6,
        rag_relevance: 0.5,
        agent_agreement: 0.7,
        model_consistency: 0.9
    },
    evidence: [
        {
            symptom: "tired",
            supporting_sources: ["General medical knowledge"],
            confidence_contribution: 1.0
        }
    ],
    explanation_summary: "Assessment based on 1 reported symptom with limited detail.",
    uncertainty_factors: [
        {
            category: "missing_data",
            description: "No medical history provided",
            impact: "Reduces confidence by approximately 20%",
            suggestion: "Provide past medical conditions"
        }
    ],
    suggested_data_improvements: [
        "Rate each symptom's severity on a scale of 1-10"
    ],
    safety: {
        safety_level: "amber" as const,
        safety_notes: "Moderate confidence. Monitor symptoms and seek care if condition changes.",
        triggered_rules: ["Medium confidence (65%)"],
        requires_immediate_care: false
    }
};

const mockCCEEDataRed = {
    confidence_score: 75,
    confidence_level: "high",
    confidence_breakdown: {
        data_completeness: 0.8,
        symptom_signal_strength: 0.85,
        rag_relevance: 0.7,
        agent_agreement: 0.6,
        model_consistency: 1.0
    },
    evidence: [
        {
            symptom: "chest pain",
            supporting_sources: ["Cardiac Emergency Guide"],
            confidence_contribution: 0.5
        }
    ],
    explanation_summary: "Emergency symptoms detected.",
    uncertainty_factors: [],
    suggested_data_improvements: [],
    safety: {
        safety_level: "red" as const,
        safety_notes: "⚠️ EMERGENCY: Symptoms suggest immediate medical attention needed. Call emergency services.",
        triggered_rules: ["Emergency symptoms detected"],
        requires_immediate_care: true
    }
};

export default function CCEEDemo() {
    const navigate = useNavigate();
    const [currentExample, setCurrentExample] = useState<'green' | 'amber' | 'red'>('green');

    const examples = {
        green: mockCCEEData,
        amber: mockCCEEDataAmber,
        red: mockCCEEDataRed
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <div className="flex-1 bg-gray-50 py-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="mb-6">
                        <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>

                        <h1 className="text-3xl font-bold mb-2">CCEE Demo</h1>
                        <p className="text-muted-foreground">
                            Clinical Confidence & Explainability Engine
                        </p>
                    </div>

                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Select Example</CardTitle>
                            <CardDescription>View different safety levels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant={currentExample === 'green' ? 'default' : 'outline'}
                                    onClick={() => setCurrentExample('green')}
                                >
                                    🟢 Green
                                </Button>
                                <Button
                                    variant={currentExample === 'amber' ? 'default' : 'outline'}
                                    onClick={() => setCurrentExample('amber')}
                                >
                                    🟡 Amber
                                </Button>
                                <Button
                                    variant={currentExample === 'red' ? 'default' : 'outline'}
                                    onClick={() => setCurrentExample('red')}
                                >
                                    🔴 Red
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <CCEEDisplay cceeData={examples[currentExample]} />
                </div>
            </div>

            <Footer />
        </div>
    );
}
