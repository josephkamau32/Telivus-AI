/**
 * CCEE Display Component
 * 
 * Shows confidence scores, safety levels, evidence mapping, and uncertainty factors
 * from the Clinical Confidence & Explainability Engine.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    Brain,
    FileText,
    HelpCircle,
    TrendingUp,
    Shield
} from "lucide-react";

interface ConfidenceBreakdown {
    data_completeness: number;
    symptom_signal_strength: number;
    rag_relevance: number;
    agent_agreement: number;
    model_consistency: number;
}

interface EvidenceItem {
    symptom: string;
    supporting_sources: string[];
    confidence_contribution: number;
}

interface UncertaintyFactor {
    category: string;
    description: string;
    impact: string;
    suggestion: string;
}

interface SafetyResult {
    safety_level: "green" | "amber" | "red";
    safety_notes: string;
    triggered_rules: string[];
    requires_immediate_care: boolean;
}

interface CCEEData {
    confidence_score: number;
    confidence_level: string;
    confidence_breakdown: ConfidenceBreakdown;
    evidence: EvidenceItem[];
    explanation_summary: string;
    uncertainty_factors: UncertaintyFactor[];
    suggested_data_improvements: string[];
    safety: SafetyResult;
}

interface CCEEDisplayProps {
    cceeData: CCEEData;
}

export function CCEEDisplay({ cceeData }: CCEEDisplayProps) {
    const getSafetyIcon = (level: string) => {
        switch (level) {
            case "green":
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case "amber":
                return <AlertTriangle className="h-5 w-5 text-amber-600" />;
            case "red":
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            default:
                return <HelpCircle className="h-5 w-5 text-gray-400" />;
        }
    };

    const getSafetyColor = (level: string) => {
        switch (level) {
            case "green":
                return "bg-green-50 border-green-200";
            case "amber":
                return "bg-amber-50 border-amber-200";
            case "red":
                return "bg-red-50 border-red-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    const getConfidenceBadge = (level: string, score: number) => {
        const colors = {
            high: "bg-green-100 text-green-800 border-green-300",
            medium: "bg-amber-100 text-amber-800 border-amber-300",
            low: "bg-red-100 text-red-800 border-red-300"
        };
        return (
            <Badge variant="outline" className={colors[level as keyof typeof colors] || colors.medium}>
                {level.toUpperCase()} {score}%
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            {/* Safety Alert */}
            <Alert className={`border-2 ${getSafetyColor(cceeData.safety.safety_level)}`}>
                <div className="flex items-start gap-3">
                    {getSafetyIcon(cceeData.safety.safety_level)}
                    <div className="flex-1">
                        <AlertDescription className="text-sm">
                            <strong>Safety Assessment:</strong> {cceeData.safety.safety_notes}
                        </AlertDescription>
                        {cceeData.safety.requires_immediate_care && (
                            <AlertDescription className="mt-2 font-semibold text-red-700">
                                ⚠️ SEEK IMMEDIATE MEDICAL ATTENTION
                            </AlertDescription>
                        )}
                    </div>
                </div>
            </Alert>

            {/* Confidence Score */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <CardTitle className="text-lg">AI Confidence</CardTitle>
                        </div>
                        {getConfidenceBadge(cceeData.confidence_level, cceeData.confidence_score)}
                    </div>
                    <CardDescription className="text-sm">
                        {cceeData.explanation_summary}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Data Completeness:</span>
                                <span className="font-medium">{Math.round(cceeData.confidence_breakdown.data_completeness * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Symptom Signal:</span>
                                <span className="font-medium">{Math.round(cceeData.confidence_breakdown.symptom_signal_strength * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Source Relevance:</span>
                                <span className="font-medium">{Math.round(cceeData.confidence_breakdown.rag_relevance * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Model Consistency:</span>
                                <span className="font-medium">{Math.round(cceeData.confidence_breakdown.model_consistency * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Evidence Mapping */}
            {cceeData.evidence.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">Evidence Sources</CardTitle>
                        </div>
                        <CardDescription>Medical knowledge consulted for this assessment</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {cceeData.evidence.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                                    <div className="font-medium text-sm capitalize mb-1">{item.symptom}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Sources: {item.supporting_sources.join(", ")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Uncertainty Factors */}
            {cceeData.uncertainty_factors.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                            <CardTitle className="text-lg">Improve Confidence</CardTitle>
                        </div>
                        <CardDescription>Additional data that would improve assessment accuracy</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {cceeData.uncertainty_factors.map((factor, idx) => (
                                <div key={idx} className="border-l-4 border-amber-400 pl-3 py-2">
                                    <div className="font-medium text-sm">{factor.description}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{factor.impact}</div>
                                    <div className="text-xs text-blue-600 mt-1">💡 {factor.suggestion}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Safety Rules Triggered */}
            {cceeData.safety.triggered_rules.length > 0 && (
                <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-600" />
                            <CardTitle className="text-sm font-medium text-gray-700">Safety Guardrails Applied</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            {cceeData.safety.triggered_rules.map((rule, idx) => (
                                <li key={idx}>• {rule}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
