import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
// Remove toast dependency to avoid React context issues
// Using simple console logging and alerts instead

interface PredictiveAlert {
  alert_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  condition_name: string;
  predicted_value?: number;
  threshold_value?: number;
  confidence_score: number;
  recommended_actions: string[];
  created_at: string;
  status: string;
  expires_at?: string;
}

interface AlertCenterProps {
  userId: string;
  onAlertAction?: (alertId: string, action: string) => void;
  className?: string;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  userId,
  onAlertAction,
  className = ""
}) => {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);

  useEffect(() => {
    // Safety check to prevent unnecessary API calls
    if (userId) {
      loadAlerts();
    } else {
      console.warn("AlertCenter: No userId provided, skipping alert load");
    }
  }, [userId, activeTab]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add safety check for component state
      if (!userId) {
        throw new Error("User ID is required to load alerts");
      }

      // Mock API call - replace with actual API integration
      const mockAlerts: PredictiveAlert[] = [
        {
          alert_id: "alert_001",
          alert_type: "symptom_worsening",
          severity: "high",
          title: "Symptom Worsening Detected",
          message: "Your headache symptoms have been trending upward over the past 3 days. Current severity: 7.2/10.",
          condition_name: "Migraine/Headache Disorder",
          predicted_value: 7.2,
          threshold_value: 7.0,
          confidence_score: 0.85,
          recommended_actions: [
            "Schedule a follow-up appointment",
            "Track your symptoms daily",
            "Review current treatment plan",
            "Consider lifestyle modifications"
          ],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          status: "active",
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          alert_id: "alert_002",
          alert_type: "preventive_action",
          severity: "medium",
          title: "Preventive Care Reminder",
          message: "It's time for your regular health check-up and preventive care review.",
          condition_name: "Preventive Care",
          confidence_score: 0.9,
          recommended_actions: [
            "Schedule annual physical examination",
            "Update vaccinations if needed",
            "Review preventive screenings",
            "Discuss lifestyle optimization"
          ],
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: "active"
        },
        {
          alert_id: "alert_003",
          alert_type: "risk_level_increase",
          severity: "high",
          title: "Elevated Risk: Cardiovascular Health",
          message: "Your risk assessment indicates elevated cardiovascular risk based on recent vital signs and symptoms.",
          condition_name: "Cardiovascular Health",
          predicted_value: 0.75,
          threshold_value: 0.7,
          confidence_score: 0.78,
          recommended_actions: [
            "Consult cardiologist for evaluation",
            "Monitor blood pressure regularly",
            "Review exercise and diet habits",
            "Consider stress management techniques"
          ],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          status: "acknowledged"
        }
      ];

      // Filter alerts based on active tab with safety checks
      let filteredAlerts = mockAlerts || [];
      try {
        if (activeTab === "active") {
          filteredAlerts = mockAlerts.filter(alert => alert && alert.status === "active");
        } else if (activeTab === "acknowledged") {
          filteredAlerts = mockAlerts.filter(alert => alert && alert.status === "acknowledged");
        } else if (activeTab === "resolved") {
          filteredAlerts = mockAlerts.filter(alert => alert && alert.status === "resolved");
        }
      } catch (filterError) {
        console.error("Error filtering alerts:", filterError);
        filteredAlerts = mockAlerts || []; // Fallback to all alerts
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAlerts(filteredAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // Validate alert exists
      const alertExists = alerts.some(alert => alert.alert_id === alertId);
      if (!alertExists) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Update local state safely
      setAlerts(prevAlerts => {
        try {
          return prevAlerts.map(alert =>
            alert.alert_id === alertId
              ? { ...alert, status: "acknowledged" }
              : alert
          );
        } catch (stateError) {
          console.error("State update error:", stateError);
          return prevAlerts; // Return unchanged state on error
        }
      });

      // Show success message
      console.log("Alert Acknowledged: Thank you for reviewing this health alert.");
      if (typeof window !== 'undefined') {
        alert("Alert Acknowledged: Thank you for reviewing this health alert.");
      }

      // Notify parent component with error handling
      try {
        onAlertAction?.(alertId, "acknowledge");
      } catch (callbackError) {
        console.warn("Parent callback error:", callbackError);
      }

      console.log(`Alert ${alertId} acknowledged by user ${userId}`);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      if (typeof window !== 'undefined') {
        alert("Error: Failed to acknowledge alert. Please try again.");
      }
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      // Validate alert exists
      const alertExists = alerts.some(alert => alert.alert_id === alertId);
      if (!alertExists) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Update local state safely
      setAlerts(prevAlerts => {
        try {
          return prevAlerts.filter(alert => alert.alert_id !== alertId);
        } catch (stateError) {
          console.error("State update error:", stateError);
          return prevAlerts; // Return unchanged state on error
        }
      });

      console.log("Alert Dismissed: Alert has been dismissed.");
      if (typeof window !== 'undefined') {
        alert("Alert Dismissed: Alert has been dismissed.");
      }

      // Notify parent component with error handling
      try {
        onAlertAction?.(alertId, "dismiss");
      } catch (callbackError) {
        console.warn("Parent callback error:", callbackError);
      }
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      if (typeof window !== 'undefined') {
        alert("Error: Failed to dismiss alert. Please try again.");
      }
    }
  };

  const handleConfigureEmail = () => {
    console.log("Opening email configuration dialog");
    try {
      setShowEmailDialog(true);
      console.log("Email dialog state set to true");
    } catch (error) {
      console.error("Error opening email dialog:", error);
    }
  };

  const handleConfigurePush = () => {
    console.log("Opening push configuration dialog");
    try {
      setShowPushDialog(true);
      console.log("Push dialog state set to true");
    } catch (error) {
      console.error("Error opening push dialog:", error);
    }
  };

  const handleConfigureSms = () => {
    console.log("Opening SMS configuration dialog");
    try {
      setShowSmsDialog(true);
      console.log("SMS dialog state set to true");
    } catch (error) {
      console.error("Error opening SMS dialog:", error);
    }
  };

  const handleSaveEmailSettings = () => {
    console.log("Email Settings Saved: Your email notification preferences have been updated.");
    if (typeof window !== 'undefined') {
      alert("Email Settings Saved: Your email notification preferences have been updated.");
    }
    setShowEmailDialog(false);
  };

  const handleSavePushSettings = () => {
    console.log("Push Settings Saved: Your push notification preferences have been updated.");
    if (typeof window !== 'undefined') {
      alert("Push Settings Saved: Your push notification preferences have been updated.");
    }
    setShowPushDialog(false);
  };

  const handleSaveSmsSettings = () => {
    console.log("SMS Settings Saved: Your SMS notification preferences have been updated.");
    if (typeof window !== 'undefined') {
      alert("SMS Settings Saved: Your SMS notification preferences have been updated.");
    }
    setShowSmsDialog(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "low":
        return <Bell className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Bell className="w-4 h-4 text-blue-600" />;
      case "acknowledged":
        return <Eye className="w-4 h-4 text-green-600" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "dismissed":
        return <EyeOff className="w-4 h-4 text-gray-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading health alerts...</p>
            <p className="text-sm text-gray-500 mt-2">Checking for new notifications</p>
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
            <p className="font-medium">Failed to load alerts</p>
            <p className="text-sm mt-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={loadAlerts}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAlerts = (alerts || []).filter(alert => alert && alert.status === "active");
  const acknowledgedAlerts = (alerts || []).filter(alert => alert && alert.status === "acknowledged");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Health Alert Center
              </CardTitle>
              <CardDescription>
                AI-powered predictive alerts and health notifications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {activeAlerts.length} Active
              </Badge>
              <Button variant="outline" size="sm" onClick={loadAlerts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alert Summary */}
      {activeAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {activeAlerts.length} active health alert{activeAlerts.length !== 1 ? 's' : ''} requiring attention.
            Please review them below.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Acknowledged ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No active alerts</p>
                  <p className="text-sm">All caught up! Check back later for new notifications.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeAlerts.map((alert) => (
              <Card key={alert.alert_id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {alert.condition_name}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(alert.created_at)}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
                            {getStatusIcon(alert.status)}
                            {alert.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(alert.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{alert.message}</p>

                  {alert.predicted_value && alert.threshold_value && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span>Current Value: <strong>{alert.predicted_value}</strong></span>
                        <span>Threshold: <strong>{alert.threshold_value}</strong></span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${
                            alert.severity === "critical" ? "bg-red-500" :
                            alert.severity === "high" ? "bg-orange-500" :
                            alert.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min((alert.predicted_value / (alert.threshold_value * 1.5)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {alert.recommended_actions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Recommended Actions:</h4>
                      <ul className="space-y-1">
                        {alert.recommended_actions.map((action, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <TrendingUp className="w-3 h-3" />
                      Expires: {alert.expires_at ? formatTimeAgo(alert.expires_at) : "No expiration"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismissAlert(alert.alert_id)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <EyeOff className="w-4 h-4 mr-2" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.alert_id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          {acknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No acknowledged alerts</p>
                  <p className="text-sm">Alerts you've reviewed will appear here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            acknowledgedAlerts.map((alert) => (
              <Card key={alert.alert_id} className="border-l-4 border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Acknowledged {formatTimeAgo(alert.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No resolved alerts</p>
                <p className="text-sm">Alerts that led to positive health outcomes will appear here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Alert Preferences
              </CardTitle>
              <CardDescription>
                Customize your alert settings and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive alerts via email</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log("Configure Email button clicked");
                      alert("Configure Email clicked!");
                      handleConfigureEmail();
                    }}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-600">Browser push notifications</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log("Configure Push button clicked");
                      alert("Configure Push clicked!");
                      handleConfigurePush();
                    }}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Alerts</p>
                    <p className="text-sm text-gray-600">Critical alerts via SMS</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log("Configure SMS button clicked");
                      alert("Configure SMS clicked!");
                      handleConfigureSms();
                    }}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Configuration Dialog */}
      {showEmailDialog && (
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Email Notification Settings</DialogTitle>
            <DialogDescription>
              Configure how you receive health alerts via email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                defaultValue="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-frequency">Alert Frequency</Label>
              <Select defaultValue="immediate">
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (Real-time)</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                  <SelectItem value="weekly">Weekly Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="email-critical" defaultChecked />
              <Label htmlFor="email-critical">Critical alerts only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="email-all" />
              <Label htmlFor="email-all">All alerts (high, medium, low)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmailSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Push Notification Configuration Dialog */}
      {showPushDialog && (
        <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Push Notification Settings</DialogTitle>
            <DialogDescription>
              Configure browser push notifications for health alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch id="push-enabled" defaultChecked />
              <Label htmlFor="push-enabled">Enable push notifications</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="push-frequency">Notification Frequency</Label>
              <Select defaultValue="immediate">
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate alerts</SelectItem>
                  <SelectItem value="batched">Batched (every 2 hours)</SelectItem>
                  <SelectItem value="quiet">Quiet hours (9 AM - 9 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="push-sound" defaultChecked />
              <Label htmlFor="push-sound">Play notification sound</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="push-vibrate" defaultChecked />
              <Label htmlFor="push-vibrate">Vibrate on notification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="push-critical-only" />
              <Label htmlFor="push-critical-only">Critical alerts only</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePushSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* SMS Configuration Dialog */}
      {showSmsDialog && (
        <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>SMS Alert Settings</DialogTitle>
            <DialogDescription>
              Configure SMS alerts for critical health notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                defaultValue="+1 (555) 123-4567"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="sms-enabled" />
              <Label htmlFor="sms-enabled">Enable SMS alerts</Label>
            </div>
            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <strong>Note:</strong> SMS alerts are only sent for critical health emergencies
              and may incur carrier charges. Enable only if you need immediate notifications.
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="sms-emergency-only" defaultChecked />
              <Label htmlFor="sms-emergency-only">Emergency alerts only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="sms-test-alert" />
              <Label htmlFor="sms-test-alert">Send test SMS</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSmsSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};