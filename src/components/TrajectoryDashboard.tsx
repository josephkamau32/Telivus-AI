import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Activity,
  TrendingUp,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Download,
  Share,
  Info,
  Copy,
  Mail,
  MessageSquare,
  Link
} from 'lucide-react';
import { TrajectoryChart } from './TrajectoryChart';
import { InterventionSimulator } from './InterventionSimulator';
import { useToast } from '@/hooks/use-toast';

interface TrajectoryData {
  user_id: string;
  trajectory_id: string;
  baseline_assessment: any;
  predictions: any[];
  recommended_interventions: any[];
  simulation_scenarios: any[];
  generated_at: string;
  model_version: string;
  disclaimer: string;
}

interface TrajectoryDashboardProps {
  userId: string;
  onRefresh?: () => void;
  className?: string;
}

export const TrajectoryDashboard: React.FC<TrajectoryDashboardProps> = ({
  userId,
  onRefresh,
  className = ""
}) => {
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadTrajectoryData();
  }, [userId]);

  const loadTrajectoryData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call - replace with actual API integration
      const mockData: TrajectoryData = {
        user_id: userId,
        trajectory_id: "traj_123",
        baseline_assessment: {
          symptom_severity: { headache: 6.5, fatigue: 7.2 },
          recorded_at: new Date().toISOString(),
          data_source: "assessment",
          confidence_score: 0.85
        },
        predictions: [{
          condition_name: "Migraine/Headache Disorder",
          prediction_horizon_days: 30,
          baseline_date: new Date().toISOString(),
          predicted_values: Array.from({ length: 30 }, (_, i) => ({
            day: i + 1,
            predicted_value: Math.max(0, 6.5 - (i * 0.15) + (Math.random() - 0.5)),
            confidence_lower: Math.max(0, 5.5 - (i * 0.15) - 1),
            confidence_upper: Math.min(10, 7.5 - (i * 0.15) + 1),
            timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
          })),
          risk_assessments: { "Migraine/Headache Disorder": 0.65 },
          confidence_score: 0.78,
          feature_importance: { headache: 0.8, stress: 0.6, sleep: 0.4 }
        }],
        recommended_interventions: [
          {
            intervention_type: "medication",
            intervention_name: "Preventive Migraine Medication",
            description: "Daily preventive medication to reduce migraine frequency",
            prescribed_by: "AI",
            dosage_instructions: { frequency: "daily", max_daily: 1 },
            schedule: { timing: "morning", duration_days: 30 },
            expected_outcome: "40-60% reduction in migraine frequency",
            side_effects: ["mild drowsiness", "nausea"],
            monitoring_required: ["headache frequency", "side effects"]
          },
          {
            intervention_type: "lifestyle",
            intervention_name: "Stress Management Program",
            description: "Comprehensive stress reduction and lifestyle modifications",
            prescribed_by: "AI",
            schedule: { daily_exercise: 30, sleep_hours: 8, stress_management: "daily" },
            expected_outcome: "25-35% improvement in headache control",
            monitoring_required: ["stress levels", "sleep quality"]
          }
        ],
        simulation_scenarios: [
          {
            scenario_name: "Medication + Lifestyle Intervention",
            intervention_changes: { type: "combined", name: "Comprehensive Treatment" },
            assumption_parameters: { adherence_rate: 0.8, effect_delay_days: 7 },
            simulated_trajectory: Array.from({ length: 30 }, (_, i) => ({
              day: i + 1,
              simulated_value: Math.max(0, 6.5 - (i * 0.25) + (Math.random() - 0.5)),
              baseline_value: 6.5 - (i * 0.15) + (Math.random() - 0.5),
              improvement: 0.1 * i,
              timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
            })),
            risk_changes: { "Migraine/Headache Disorder": -0.25 },
            probability_improvement: 0.82,
            expected_value: 2.3,
            recommendation_strength: 0.85
          }
        ],
        generated_at: new Date().toISOString(),
        model_version: "1.0.0",
        disclaimer: "Trajectory predictions are estimates based on available data and should not replace professional medical advice."
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTrajectoryData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trajectory data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadTrajectoryData();
    onRefresh?.();
    console.log("Data refreshed: Trajectory analysis has been updated with latest data.");
  };

  const handleExport = () => {
    if (!trajectoryData) return;

    const dataStr = JSON.stringify(trajectoryData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `trajectory-analysis-${userId}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    console.log("Export complete: Trajectory data has been downloaded.");
  };

  const handleShare = () => {
    // Generate shareable URL (in production, this would be a unique share link)
    const currentUrl = window.location.href;
    const shareableUrl = `${currentUrl}?shared=true&trajectory=${trajectoryData?.trajectory_id}`;

    // Generate default share message
    const conditionName = trajectoryData?.predictions[0]?.condition_name || "Health Condition";
    const confidence = trajectoryData?.predictions[0]?.confidence_score || 0;
    const defaultMessage = `Check out my AI-powered health trajectory analysis for ${conditionName}. The model predicts with ${Math.round(confidence * 100)}% confidence. #HealthAI #TelivusAI`;

    setShareUrl(shareableUrl);
    setShareMessage(defaultMessage);
    setIsShareDialogOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Shareable link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent("My Health Trajectory Analysis");
    const body = encodeURIComponent(`${shareMessage}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareViaWhatsApp = () => {
    const text = encodeURIComponent(`${shareMessage}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareViaTwitter = () => {
    const text = encodeURIComponent(`${shareMessage} ${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Analyzing your health trajectory...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">Failed to load trajectory data</p>
            <p className="text-sm mt-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trajectoryData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No trajectory data available</p>
            <p className="text-sm">Complete health assessments to generate trajectory analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const primaryPrediction = trajectoryData.predictions[0];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Health Trajectory Analysis
              </CardTitle>
              <CardDescription>
                AI-powered prediction of your health progression and personalized intervention recommendations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Model {trajectoryData.model_version}
              </Badge>
              <Badge variant="secondary">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(trajectoryData.generated_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-600">Primary Condition</p>
                <p className="font-medium">{primaryPrediction.condition_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Prediction Confidence</p>
                <p className="font-medium text-green-600">
                  {Math.round(primaryPrediction.confidence_score * 100)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Level</p>
                <p className="font-medium text-yellow-600">
                  {Object.values(primaryPrediction.risk_assessments as Record<string, number>)[0] > 0.7 ? 'High' :
                   Object.values(primaryPrediction.risk_assessments as Record<string, number>)[0] > 0.4 ? 'Moderate' : 'Low'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Share Health Trajectory Analysis</DialogTitle>
                    <DialogDescription>
                      Share your AI-powered health insights with healthcare providers or loved ones.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="share-message">Message</Label>
                      <Textarea
                        id="share-message"
                        value={shareMessage}
                        onChange={(e) => setShareMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="share-url">Shareable Link</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="share-url"
                          value={shareUrl}
                          readOnly
                          className="flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyLink}
                          className="flex-shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Share via</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleShareViaEmail}
                          className="flex items-center justify-start gap-2 h-9"
                        >
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Email</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleShareViaWhatsApp}
                          className="flex items-center justify-start gap-2 h-9"
                        >
                          <MessageSquare className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">WhatsApp</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleShareViaTwitter}
                          className="flex items-center justify-start gap-2 h-9"
                        >
                          <Link className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Twitter</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-shrink-0 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsShareDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {trajectoryData.disclaimer}
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrajectoryChart
              data={primaryPrediction.predicted_values}
              conditionName={primaryPrediction.condition_name}
              confidenceScore={primaryPrediction.confidence_score}
            />

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Current and predicted health risks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(primaryPrediction.risk_assessments as Record<string, number>).map(([condition, risk]) => (
                  <div key={condition} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{condition}</span>
                      <span className={`font-medium ${
                        risk > 0.7 ? 'text-red-600' :
                        risk > 0.4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {Math.round(risk * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          risk > 0.7 ? 'bg-red-500' :
                          risk > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${risk * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <TrajectoryChart
            data={primaryPrediction.predicted_values}
            conditionName={primaryPrediction.condition_name}
            confidenceScore={primaryPrediction.confidence_score}
            showBaseline={false}
            showConfidenceInterval={true}
          />

          <Card>
            <CardHeader>
              <CardTitle>Prediction Details</CardTitle>
              <CardDescription>Detailed breakdown of trajectory prediction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Key Factors</h4>
                  <div className="space-y-2">
                    {Object.entries(primaryPrediction.feature_importance as Record<string, number>).map(([factor, importance]) => (
                      <div key={factor} className="flex justify-between">
                        <span className="text-sm capitalize">{factor.replace('_', ' ')}</span>
                        <span className="text-sm font-medium">{Math.round(importance * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Prediction Summary</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Horizon:</strong> {primaryPrediction.prediction_horizon_days} days</p>
                    <p><strong>Baseline:</strong> {new Date(primaryPrediction.baseline_date).toLocaleDateString()}</p>
                    <p><strong>Trend:</strong> {
                      primaryPrediction.predicted_values[primaryPrediction.predicted_values.length - 1].predicted_value <
                      primaryPrediction.predicted_values[0].predicted_value ? 'Improving' : 'Stable/Worsening'
                    }</p>
                    <p><strong>Confidence:</strong> {Math.round(primaryPrediction.confidence_score * 100)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-6">
          <InterventionSimulator
            scenarios={trajectoryData.simulation_scenarios}
            baselineTrajectory={primaryPrediction.predicted_values}
            onScenarioSelect={(scenario) => {
              console.log(`Scenario selected: ${scenario.scenario_name} simulation completed.`);
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>Recommended Interventions</CardTitle>
              <CardDescription>Personalized treatment recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trajectoryData.recommended_interventions.map((intervention, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{intervention.intervention_name}</h4>
                        <p className="text-sm text-gray-600">{intervention.description}</p>
                      </div>
                      <Badge variant="outline">{intervention.intervention_type}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Expected Outcome:</strong> {intervention.expected_outcome}</p>
                        {intervention.dosage_instructions && (
                          <p><strong>Dosage:</strong> {JSON.stringify(intervention.dosage_instructions)}</p>
                        )}
                      </div>
                      <div>
                        {intervention.side_effects && intervention.side_effects.length > 0 && (
                          <p><strong>Side Effects:</strong> {intervention.side_effects.join(', ')}</p>
                        )}
                        {intervention.monitoring_required && (
                          <p><strong>Monitor:</strong> {intervention.monitoring_required.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};