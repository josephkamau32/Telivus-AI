import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Brain, Activity, TrendingUp, AlertTriangle, Sparkles, BarChart3, Target, Zap, Calendar, Award, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
    useDigitalTwin,
    useTwinStats,
    useHealthTimeline,
    useLearnedPatterns,
    useProactiveAlerts,
    useTwinInsights,
    useTriggerLearning,
    useAcknowledgeAlert,
} from "@/integrations/supabase/hooks/useDigitalTwin";
import { useSyncHistoricalData } from "@/integrations/supabase/hooks/useSyncHistoricalData";
import { format } from "date-fns";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DigitalTwinDashboard = () => {
    const navigate = useNavigate();
    const [isLearning, setIsLearning] = useState(false);
    const [hasSynced, setHasSynced] = useState(false);

    const { data: twin, isLoading: twinLoading, error: twinError } = useDigitalTwin();
    const { data: stats, isLoading: statsLoading, error: statsError } = useTwinStats();
    const { data: timeline } = useHealthTimeline(20);
    const { data: patterns } = useLearnedPatterns(70);
    const { data: alerts } = useProactiveAlerts();
    const { data: insights } = useTwinInsights();

    const triggerLearning = useTriggerLearning();
    const acknowledgeAlert = useAcknowledgeAlert();
    const syncHistoricalData = useSyncHistoricalData();

    // Auto-sync disabled to fix slow initialization
    // User can manually click "Sync & Learn" button
    // useEffect(() => {
    //     if (twin && !hasSynced) {
    //         handleAutoSync();
    //     }
    // }, [twin]);

    const handleAutoSync = async () => {
        try {
            const result = await syncHistoricalData.mutateAsync();
            setHasSynced(true);

            if (result.sync_stats && result.sync_stats.events_created > 0) {
                toast.success("Data Synced!", {
                    description: `Loaded ${result.sync_stats.events_created} health events into your twin.`,
                });

                // If learning results exist, show them
                if (result.learning_results) {
                    const lr = result.learning_results;
                    if (lr.patterns_discovered > 0 || lr.insights_generated > 0) {
                        toast.success("Twin Learned!", {
                            description: `Discovered ${lr.patterns_discovered} patterns and generated ${lr.insights_generated} insights!`,
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Auto-sync failed:", error);
            // Don't show error toast for auto-sync to avoid annoying users
        }
    };

    const handleLearnNow = async () => {
        setIsLearning(true);
        try {
            const result = await triggerLearning.mutateAsync();
            toast.success("Learning Complete!", {
                description: `Discovered ${result.patterns_discovered} patterns, generated ${result.insights_generated} insights, and created ${result.alerts_created} alerts.`,
            });
        } catch (error: any) {
            console.error("Learning error:", error);
            toast.error("Learning failed", {
                description: error?.message || "Failed to analyze your health data. Make sure the backend is running.",
            });
        } finally {
            setIsLearning(false);
        }
    };

    const handleAcknowledgeAlert = async (alertId: string) => {
        try {
            await acknowledgeAlert.mutateAsync(alertId);
            toast.success("Alert acknowledged");
        } catch (error) {
            toast.error("Failed to acknowledge alert");
        }
    };

    const getLearningLevelColor = (level: string) => {
        switch (level) {
            case "expert":
                return "bg-purple-500";
            case "advanced":
                return "bg-blue-500";
            case "intermediate":
                return "bg-green-500";
            default:
                return "bg-gray-500";
        }
    };

    const getSeverityColor = (severity: string): "destructive" | "default" => {
        switch (severity) {
            case "critical":
                return "destructive";
            case "high":
                return "destructive";
            default:
                return "default";
        }
    };

    if (twinError || statsError) {
        return (
            <div className="container max-w-7xl mx-auto p-6 space-y-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4 max-w-md">
                        <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
                        <h2 className="text-2xl font-bold">Backend Connection Error</h2>
                        <p className="text-muted-foreground">
                            Cannot connect to the Digital Twin API. Please make sure the backend server is running on {API_BASE_URL}.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Retry
                            </Button>
                            <Button onClick={() => navigate("/")}>
                                Go to Home
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (twinLoading || statsLoading) {
        return (
            <div className="container max-w-7xl mx-auto p-6 space-y-8">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4">
                        <Brain className="w-16 h-16 animate-pulse mx-auto text-primary" />
                        <p className="text-lg text-muted-foreground">Initializing your Digital Twin...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                            <Brain className="w-10 h-10 text-primary" />
                            {twin?.twin_name || "Your Health Twin"}
                        </h1>
                        <p className="text-muted-foreground">
                            Your personalized AI health avatar that learns from every interaction
                        </p>
                    </div>
                    <Button
                        onClick={handleLearnNow}
                        disabled={isLearning}
                        size="lg"
                        className="gap-2"
                    >
                        {isLearning ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-spin" />
                                Learning...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Analyze Now
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Twin Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Learning Level</CardTitle>
                            <Award className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold capitalize">{stats?.learning_level || "Beginner"}</span>
                                <Badge className={getLearningLevelColor(stats?.learning_level || "beginner")}>
                                    {stats?.data_points || 0} data points
                                </Badge>
                            </div>
                            <Progress value={stats?.confidence_level || 0} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                {stats?.confidence_level?.toFixed(0)}% confidence
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Patterns Learned</CardTitle>
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{stats?.patterns_learned || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Discovered from {stats?.interactions || 0} interactions
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{stats?.active_alerts || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Proactive health predictions
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Twin Age</CardTitle>
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{stats?.twin_age_days || 0} days</div>
                            <p className="text-xs text-muted-foreground">
                                Accuracy: {stats?.accuracy_score?.toFixed(0)}%
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="insights" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="insights" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Insights
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Alerts ({alerts?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="patterns" className="gap-2">
                        <Target className="w-4 h-4" />
                        Patterns
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2">
                        <Activity className="w-4 h-4" />
                        Timeline
                    </TabsTrigger>
                </TabsList>

                {/* Insights Tab */}
                <TabsContent value="insights" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                What Your Twin Has Learned
                            </CardTitle>
                            <CardDescription>
                                Key insights discovered from your health data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {insights && insights.length > 0 ? (
                                insights.map((insight) => (
                                    <Alert key={insight.id} className={insight.is_highlighted ? "border-2 border-primary" : ""}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertTitle className="text-base">{insight.title}</AlertTitle>
                                                    <Badge variant={insight.health_impact === "positive" ? "default" : "secondary"}>
                                                        {insight.evidence_strength} evidence
                                                    </Badge>
                                                    <Badge variant="outline">{insight.confidence_level.toFixed(0)}% confidence</Badge>
                                                </div>
                                                <AlertDescription>{insight.description}</AlertDescription>
                                                {insight.is_actionable && insight.suggested_actions && (
                                                    <div className="mt-3 space-y-1">
                                                        <p className="text-sm font-medium">Suggested Actions:</p>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {insight.suggested_actions.map((action, idx) => (
                                                                <li key={idx} className="text-sm text-muted-foreground">{action}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Alert>
                                ))
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <Brain className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                    <div>
                                        <p className="text-lg font-medium">No insights yet</p>
                                        <p className="text-sm text-muted-foreground">
                                            Your twin needs more data to generate insights. Complete a few health assessments first.
                                        </p>
                                    </div>
                                    <Button onClick={() => navigate("/")}>Complete Health Assessment</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Alerts Tab */}
                <TabsContent value="alerts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Proactive Health Alerts
                            </CardTitle>
                            <CardDescription>
                                AI-predicted risks and recommendations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {alerts && alerts.length > 0 ? (
                                alerts.map((alert) => (
                                    <Alert key={alert.id} variant={getSeverityColor(alert.severity)} className="relative">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <AlertTitle>{alert.title}</AlertTitle>
                                                    <Badge variant="outline">{alert.severity}</Badge>
                                                    {alert.predicted_likelihood && (
                                                        <Badge>{alert.predicted_likelihood.toFixed(0)}% likelihood</Badge>
                                                    )}
                                                </div>
                                                <AlertDescription>{alert.description}</AlertDescription>
                                                {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        <p className="text-sm font-medium">Recommended Actions:</p>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {alert.recommended_actions.map((action, idx) => (
                                                                <li key={idx} className="text-sm">{action}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Triggered {format(new Date(alert.triggered_at), "PPp")}
                                                </p>
                                            </div>
                                            {alert.status === "active" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAcknowledgeAlert(alert.id)}
                                                >
                                                    Acknowledge
                                                </Button>
                                            )}
                                        </div>
                                    </Alert>
                                ))
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <Target className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                    <div>
                                        <p className="text-lg font-medium">No active alerts</p>
                                        <p className="text-sm text-muted-foreground">
                                            Your twin will proactively alert you when it detects potential health risks.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Patterns Tab */}
                <TabsContent value="patterns" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Learned Health Patterns
                            </CardTitle>
                            <CardDescription>
                                Cause-effect relationships your twin discovered
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {patterns && patterns.length > 0 ? (
                                <div className="space-y-3">
                                    {patterns.map((pattern) => (
                                        <div key={pattern.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={pattern.effect_direction === "positive" ? "default" : "secondary"}>
                                                        {pattern.pattern_type}
                                                    </Badge>
                                                    <span className="text-sm font-medium">{pattern.cause}</span>
                                                    <span className="text-sm text-muted-foreground">→</span>
                                                    <span className="text-sm font-medium">{pattern.effect}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{pattern.confidence_score.toFixed(0)}% confidence</span>
                                                    <span>•</span>
                                                    <span>{pattern.evidence_count} occurrences</span>
                                                    <span>•</span>
                                                    <span>Discovered {format(new Date(pattern.discovered_at), "PP")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                    <div>
                                        <p className="text-lg font-medium">No patterns discovered yet</p>
                                        <p className="text-sm text-muted-foreground">
                                            Your twin needs at least 5 health events to start recognizing patterns.
                                        </p>
                                    </div>
                                    <Button onClick={handleLearnNow} disabled={isLearning}>
                                        {isLearning ? "Analyzing..." : "Analyze Now"}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Health Timeline
                            </CardTitle>
                            <CardDescription>
                                Your longitudinal health journey
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {timeline && timeline.length > 0 ? (
                                <div className="space-y-4">
                                    {timeline.map((event, idx) => (
                                        <div key={event.id} className="relative pl-8 pb-6 border-l-2 border-muted last:border-0">
                                            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary"></div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{event.event_type}</Badge>
                                                    {event.severity !== null && (
                                                        <Badge variant={event.severity > 7 ? "destructive" : "secondary"}>
                                                            Severity: {event.severity}/10
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(event.event_date), "PPp")}
                                                </p>
                                                {event.feeling_state && (
                                                    <p className="text-sm">Feeling: <span className="font-medium capitalize">{event.feeling_state}</span></p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-4">
                                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                                    <div>
                                        <p className="text-lg font-medium">No health events yet</p>
                                        <p className="text-sm text-muted-foreground">
                                            Start tracking your health journey by completing assessments.
                                        </p>
                                    </div>
                                    <Button onClick={() => navigate("/")}>Get Started</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DigitalTwinDashboard;
