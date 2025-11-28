import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/contexts/LanguageContext';
import { AlertCenter } from '@/components/AlertCenter';
import { TrajectoryDashboard } from '@/components/TrajectoryDashboard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Calendar,
  FileText,
  MessageSquare,
  Target,
  Award,
  Clock,
  Heart,
  Thermometer,
  Stethoscope,
  ArrowLeft,
  Footprints,
  Moon,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Download,
  Bell,
  Settings,
  Smartphone,
  User,
  Trash2
} from 'lucide-react';

interface HealthMetric {
  date: string;
  symptoms: number;
  reports: number;
  chats: number;
  severity: number;
}

interface VitalsData {
  date: string;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  sleepHours: number;
  steps: number;
  temperature?: number;
}

interface HealthGoal {
  id: string;
  type: 'steps' | 'sleep' | 'weight' | 'exercise';
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

interface AIInsight {
  id: string;
  type: 'warning' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface SymptomData {
  name: string;
  count: number;
  color: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState<HealthMetric[]>([]);
  const [symptomStats, setSymptomStats] = useState<SymptomData[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [vitalsData, setVitalsData] = useState<VitalsData[]>([]);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>(() => {
    const saved = localStorage.getItem('health-goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: '',
    target: '',
    unit: '',
    deadline: ''
  });
  const [celebrationGoal, setCelebrationGoal] = useState<string | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    const saved = localStorage.getItem('emergency-contacts');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'John Doe', phone: '+1 234 567 8900', relationship: 'Emergency Contact' },
      { id: '2', name: 'Dr. Smith', phone: '+1 234 567 8901', relationship: 'Primary Physician' }
    ];
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotificationTest, setShowNotificationTest] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, isLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock data for demonstration
      // In a real app, this would come from the database
      const mockHealthData: HealthMetric[] = [
        { date: '2024-11-01', symptoms: 2, reports: 1, chats: 3, severity: 3 },
        { date: '2024-11-02', symptoms: 1, reports: 0, chats: 2, severity: 2 },
        { date: '2024-11-03', symptoms: 3, reports: 1, chats: 4, severity: 4 },
        { date: '2024-11-04', symptoms: 1, reports: 0, chats: 1, severity: 1 },
        { date: '2024-11-05', symptoms: 2, reports: 1, chats: 3, severity: 3 },
        { date: '2024-11-06', symptoms: 0, reports: 0, chats: 2, severity: 0 },
        { date: '2024-11-07', symptoms: 1, reports: 0, chats: 1, severity: 2 },
      ];

      const mockSymptomStats: SymptomData[] = [
        { name: 'Headache', count: 12, color: '#8884d8' },
        { name: 'Fatigue', count: 8, color: '#82ca9d' },
        { name: 'Cough', count: 6, color: '#ffc658' },
        { name: 'Fever', count: 4, color: '#ff7300' },
        { name: 'Nausea', count: 3, color: '#00ff00' },
      ];

      const mockReports = [
        {
          id: 1,
          date: '2024-11-07',
          symptoms: ['Headache', 'Fatigue'],
          assessment: 'Tension headache',
          severity: 'Mild'
        },
        {
          id: 2,
          date: '2024-11-03',
          symptoms: ['Cough', 'Fever'],
          assessment: 'Upper respiratory infection',
          severity: 'Moderate'
        },
        {
          id: 3,
          date: '2024-11-01',
          symptoms: ['Headache'],
          assessment: 'Migraine',
          severity: 'Severe'
        }
      ];

      const mockVitalsData: VitalsData[] = [
        { date: '2024-11-01', heartRate: 72, bloodPressure: { systolic: 120, diastolic: 80 }, sleepHours: 7.5, steps: 8500 },
        { date: '2024-11-02', heartRate: 75, bloodPressure: { systolic: 118, diastolic: 78 }, sleepHours: 8.0, steps: 9200 },
        { date: '2024-11-03', heartRate: 78, bloodPressure: { systolic: 122, diastolic: 82 }, sleepHours: 6.5, steps: 7800 },
        { date: '2024-11-04', heartRate: 70, bloodPressure: { systolic: 119, diastolic: 79 }, sleepHours: 7.8, steps: 10100 },
        { date: '2024-11-05', heartRate: 73, bloodPressure: { systolic: 121, diastolic: 81 }, sleepHours: 7.2, steps: 8900 },
        { date: '2024-11-06', heartRate: 76, bloodPressure: { systolic: 117, diastolic: 77 }, sleepHours: 8.2, steps: 9500 },
        { date: '2024-11-07', heartRate: 74, bloodPressure: { systolic: 120, diastolic: 80 }, sleepHours: 7.0, steps: 8200 },
      ];

      const mockHealthGoals: HealthGoal[] = [
        { id: '1', type: 'steps', target: 10000, current: 8200, unit: 'steps', deadline: '2024-12-01' },
        { id: '2', type: 'sleep', target: 8, current: 7.0, unit: 'hours', deadline: '2024-12-01' },
        { id: '3', type: 'exercise', target: 150, current: 120, unit: 'minutes', deadline: '2024-12-01' },
      ];

      const mockAiInsights: AIInsight[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Irregular Sleep Pattern Detected',
          description: 'Your sleep duration has been inconsistent. Consider maintaining a regular sleep schedule.',
          priority: 'medium'
        },
        {
          id: '2',
          type: 'recommendation',
          title: 'Increase Daily Steps',
          description: 'You\'re close to your 10,000 steps goal! Try a 20-minute walk after dinner.',
          priority: 'low'
        },
        {
          id: '3',
          type: 'achievement',
          title: 'Blood Pressure Stable',
          description: 'Great job! Your blood pressure readings have been consistently within normal range.',
          priority: 'low'
        }
      ];

      setHealthData(mockHealthData);
      setSymptomStats(mockSymptomStats);
      setRecentReports(mockReports);
      setVitalsData(mockVitalsData);
      setHealthGoals(mockHealthGoals);
      setAiInsights(mockAiInsights);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDataError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'text-red-600';
    if (severity >= 3) return 'text-orange-600';
    if (severity >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'severe': return <Badge variant="destructive">Severe</Badge>;
      case 'moderate': return <Badge className="bg-orange-500">Moderate</Badge>;
      case 'mild': return <Badge className="bg-yellow-500">Mild</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const calculateHealthScore = () => {
    if (vitalsData.length === 0) return 85;

    const latest = vitalsData[vitalsData.length - 1];
    let score = 100;

    // Heart rate scoring (60-100 is normal)
    if (latest.heartRate < 60 || latest.heartRate > 100) score -= 15;

    // Blood pressure scoring (normal: <120/80)
    if (latest.bloodPressure.systolic >= 140 || latest.bloodPressure.diastolic >= 90) score -= 20;
    else if (latest.bloodPressure.systolic >= 130 || latest.bloodPressure.diastolic >= 80) score -= 10;

    // Sleep scoring (7-9 hours is optimal)
    if (latest.sleepHours < 6) score -= 15;
    else if (latest.sleepHours < 7) score -= 5;

    // Steps scoring (10,000 is target)
    const stepsPercentage = (latest.steps / 10000) * 100;
    if (stepsPercentage < 50) score -= 15;
    else if (stepsPercentage < 75) score -= 5;

    return Math.max(0, Math.min(100, score));
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportDashboardData = () => {
    const exportData = {
      healthMetrics: healthData,
      vitalsData: vitalsData,
      healthGoals: healthGoals,
      aiInsights: aiInsights,
      recentReports: recentReports,
      exportDate: new Date().toISOString(),
      healthScore: calculateHealthScore()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `health-dashboard-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getHealthReminders = () => {
    const reminders = [];
    const latestVitals = vitalsData[vitalsData.length - 1];

    if (latestVitals.sleepHours < 7) {
      reminders.push({
        id: 'sleep',
        title: 'Sleep Reminder',
        message: 'You slept less than 7 hours last night. Consider an earlier bedtime tonight.',
        type: 'warning',
        time: '9:00 PM'
      });
    }

    if (latestVitals.steps < 8000) {
      reminders.push({
        id: 'steps',
        title: 'Activity Reminder',
        message: 'You\'re behind on your daily steps goal. Take a 10-minute walk!',
        type: 'info',
        time: '2:00 PM'
      });
    }

    if (latestVitals.heartRate > 80) {
      reminders.push({
        id: 'heart',
        title: 'Heart Rate Check',
        message: 'Your resting heart rate is elevated. Consider relaxation techniques.',
        type: 'warning',
        time: '8:00 AM'
      });
    }

    // Medication reminder (mock)
    reminders.push({
      id: 'medication',
      title: 'Medication Reminder',
      message: 'Time for your daily vitamin D supplement.',
      type: 'success',
      time: '8:00 AM'
    });

    return reminders;
  };

  const handleCreateGoal = (goalType: string) => {
    const defaultTargets = {
      steps: { target: '10000', unit: 'steps' },
      sleep: { target: '8', unit: 'hours' },
      exercise: { target: '150', unit: 'minutes' },
      weight: { target: '70', unit: 'kg' }
    };

    const defaultData = defaultTargets[goalType as keyof typeof defaultTargets] || { target: '100', unit: 'units' };

    setNewGoal({
      type: goalType,
      target: defaultData.target,
      unit: defaultData.unit,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = () => {
    if (!newGoal.target || !newGoal.deadline) {
      alert('Please fill in all required fields');
      return;
    }

    const goal: HealthGoal = {
      id: Date.now().toString(),
      type: newGoal.type as HealthGoal['type'],
      target: parseInt(newGoal.target),
      current: 0,
      unit: newGoal.unit,
      deadline: newGoal.deadline
    };

    const updatedGoals = [...healthGoals, goal];
    setHealthGoals(updatedGoals);
    localStorage.setItem('health-goals', JSON.stringify(updatedGoals));

    alert(`🎯 ${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} goal created!\nTarget: ${goal.target} ${goal.unit}\nDeadline: ${new Date(goal.deadline).toLocaleDateString()}`);

    setIsGoalModalOpen(false);
    setNewGoal({ type: '', target: '', unit: '', deadline: '' });
  };

  const updateGoalProgress = (goalId: string, newProgress: number) => {
    setHealthGoals(prev => prev.map(goal => {
      const updatedGoal = { ...goal, current: Math.min(newProgress, goal.target) };

      // Check if goal was just achieved
      if (updatedGoal.current >= goal.target && goal.current < goal.target) {
        setCelebrationGoal(goalId);
        // Clear celebration after 3 seconds
        setTimeout(() => setCelebrationGoal(null), 3000);
      }

      return updatedGoal;
    }));
  };

  // Simulate real-time vitals updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVitalsData(prev => {
        if (prev.length === 0) return prev;

        const latest = prev[prev.length - 1];
        const now = new Date();

        // Only update if it's a new day or significant time has passed
        const lastUpdate = new Date(latest.date);
        const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

        if (hoursDiff >= 1) { // Update every hour
          const newVitals: VitalsData = {
            date: now.toISOString().split('T')[0],
            heartRate: Math.max(60, Math.min(100, latest.heartRate + (Math.random() - 0.5) * 4)),
            bloodPressure: {
              systolic: Math.max(110, Math.min(140, latest.bloodPressure.systolic + (Math.random() - 0.5) * 6)),
              diastolic: Math.max(70, Math.min(90, latest.bloodPressure.diastolic + (Math.random() - 0.5) * 4))
            },
            sleepHours: Math.max(4, Math.min(10, latest.sleepHours + (Math.random() - 0.5) * 1.5)),
            steps: Math.max(0, latest.steps + Math.floor(Math.random() * 500) - 250)
          };

          // Keep only last 7 days of data
          const updated = [...prev, newVitals].slice(-7);
          return updated;
        }

        return prev;
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Persist goals to localStorage
  useEffect(() => {
    localStorage.setItem('health-goals', JSON.stringify(healthGoals));
  }, [healthGoals]);

  // Persist emergency contacts to localStorage
  useEffect(() => {
    localStorage.setItem('emergency-contacts', JSON.stringify(emergencyContacts));
  }, [emergencyContacts]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        alert('✅ Notifications enabled! You can now receive health reminders.');
        return true;
      } else if (permission === 'denied') {
        alert('❌ Notifications denied. Please enable notifications in your browser settings.');
        return false;
      } else {
        alert('⏳ Notification permission is pending. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('❌ Error enabling notifications. Please try again.');
      return false;
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          tag: 'health-reminder',
          requireInteraction: false
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        alert(`Notification: ${title}\n${body}`);
      }
    } else {
      // Fallback: show alert
      alert(`Notification: ${title}\n${body}`);
    }
  };

  const sendHealthReminders = () => {
    const reminders = getHealthReminders();

    if (reminders.length === 0) {
      showNotification('Health Check', 'All your health metrics are looking good! Keep it up! 🎉', '/favicon.ico');
      return;
    }

    reminders.forEach((reminder, index) => {
      setTimeout(() => {
        showNotification(reminder.title, reminder.message, '/favicon.ico');
      }, index * 1000); // Stagger notifications by 1 second
    });

    alert(`📢 Sent ${reminders.length} health reminder${reminders.length > 1 ? 's' : ''}!`);
  };

  const updateEmergencyContact = (id: string, field: string, value: string) => {
    setEmergencyContacts(prev => prev.map(contact =>
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now().toString(),
      name: '',
      phone: '',
      relationship: ''
    };
    setEmergencyContacts(prev => [...prev, newContact]);
  };

  const removeEmergencyContact = (id: string) => {
    setEmergencyContacts(prev => prev.filter(contact => contact.id !== id));
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-destructive text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Data Loading Error</h2>
          <p className="text-muted-foreground">{dataError}</p>
          <Button onClick={loadDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t.healthDashboard}</h1>
            <p className="text-muted-foreground">{t.trackTrends}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Wearable Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">Real-time Sync</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                if (notificationPermission !== 'granted') {
                  await requestNotificationPermission();
                } else {
                  sendHealthReminders();
                }
              }}
            >
              <Bell className="w-4 h-4" />
              {notificationPermission === 'granted' ? 'Send Reminders' : 'Enable Notifications'}
            </Button>
            <Button onClick={exportDashboardData} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Button onClick={() => navigate('/trajectory')} variant="default" className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <TrendingUp className="w-4 h-4" />
              Health Trajectory
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t.backToAssessment}
            </Button>
          </div>
        </div>

        {/* Health Alert Center */}
        <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
          <AlertCenter
            userId={user?.id || "demo_user"}
            onAlertAction={(alertId, action) => {
              console.log(`Alert ${alertId} ${action} by user ${user?.id || "demo_user"}`);
              // In a real app, this would send the action to the backend
            }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in fade-in-50 duration-500">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalReports}</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.aiChats}</p>
                  <p className="text-2xl font-bold">47</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.healthScore}</p>
                  <p className={`text-2xl font-bold ${getHealthScoreColor(calculateHealthScore())}`}>
                    {calculateHealthScore()}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.thisWeek}</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vitals Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Heart Rate</p>
                  <p className="text-2xl font-bold text-red-600">74 BPM</p>
                  <p className="text-xs text-green-600">Normal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Pressure</p>
                  <p className="text-2xl font-bold text-blue-600">120/80</p>
                  <p className="text-xs text-green-600">Normal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Moon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sleep</p>
                  <p className="text-2xl font-bold text-purple-600">7.0h</p>
                  <p className="text-xs text-yellow-600">Below target</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Footprints className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Steps Today</p>
                  <p className="text-2xl font-bold text-green-600">8,200</p>
                  <p className="text-xs text-orange-600">82% of goal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Health Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    insight.type === 'warning' ? 'bg-red-100 text-red-600' :
                    insight.type === 'recommendation' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {insight.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {insight.type === 'recommendation' && <Lightbulb className="w-4 h-4" />}
                    {insight.type === 'achievement' && <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  <Badge variant={insight.priority === 'high' ? 'destructive' : 'secondary'}>
                    {insight.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Trajectory Analysis */}
        <div className="animate-in slide-in-from-bottom-4 duration-700">
          <TrajectoryDashboard
            userId={user?.id || "demo_user"}
            onRefresh={() => loadDashboardData()}
            className="animate-in fade-in-50 duration-500"
          />
        </div>

        {/* Emergency & Safety */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-red-700 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Emergency & Safety
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addEmergencyContact}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Add Contact
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Emergency Alert</p>
                  <p className="text-sm text-muted-foreground">All systems normal</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Auto-Alert System</p>
                  <p className="text-sm text-muted-foreground">Enabled for critical vitals</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {notificationPermission === 'granted' ? 'Enabled' : 'Click to enable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contacts List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-red-700 dark:text-red-400">Emergency Contacts</h4>
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(contact.id, 'name', e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(contact.id, 'phone', e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Relationship"
                      value={contact.relationship}
                      onChange={(e) => updateEmergencyContact(contact.id, 'relationship', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmergencyContact(contact.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personalized Recommendations */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Personalized Health Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Today's Focus</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <Moon className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Improve Sleep Quality</p>
                      <p className="text-sm text-muted-foreground">Aim for 7-8 hours. Try winding down 30 minutes before bed.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <Footprints className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Increase Daily Steps</p>
                      <p className="text-sm text-muted-foreground">You're at 8,200 steps. Target: 10,000 for optimal health.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Long-term Goals</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <Heart className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Maintain Heart Health</p>
                      <p className="text-sm text-muted-foreground">Your heart rate is stable. Continue regular exercise.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <Activity className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Build Exercise Habit</p>
                      <p className="text-sm text-muted-foreground">Current: 120 min/week. Target: 150 min/week.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Reminders */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Today's Health Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getHealthReminders().map((reminder) => (
                <div key={reminder.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  reminder.type === 'warning' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
                  reminder.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20' :
                  'bg-blue-50 border-blue-200 dark:bg-blue-950/20'
                }`}>
                  <div className={`p-2 rounded-lg ${
                    reminder.type === 'warning' ? 'bg-red-100 text-red-600' :
                    reminder.type === 'success' ? 'bg-green-100 text-green-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {reminder.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {reminder.type === 'success' && <CheckCircle className="w-4 h-4" />}
                    {reminder.type === 'info' && <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{reminder.title}</h4>
                      <span className="text-sm text-muted-foreground">{reminder.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{reminder.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts and Analytics */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trends">{t.healthTrends}</TabsTrigger>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="symptoms">{t.symptomAnalysis}</TabsTrigger>
            <TabsTrigger value="history">{t.recentHistory}</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Symptom Frequency Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    {t.symptomFrequency}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Area type="monotone" dataKey="symptoms" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Severity Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {t.severityTrends}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Line type="monotone" dataKey="severity" stroke="#ff7300" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Activity Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  {t.weeklyActivityOverview}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={healthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <Bar dataKey="reports" fill="#8884d8" name="Reports" />
                    <Bar dataKey="chats" fill="#82ca9d" name="AI Chats" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="symptoms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Symptom Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {t.mostCommonSymptoms}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={symptomStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {symptomStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Symptom Frequency Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Symptom Frequency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={symptomStats} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vitals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Heart Rate Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Heart Rate Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis domain={[60, 90]} />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Line type="monotone" dataKey="heartRate" stroke="#dc2626" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Blood Pressure Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    Blood Pressure Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis domain={[70, 140]} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value, name) => [
                          name === 'systolic' ? `${value}/${vitalsData.find(d => d.date === value)?.bloodPressure.diastolic}` : value,
                          name === 'systolic' ? 'Systolic/Diastolic' : 'Diastolic'
                        ]}
                      />
                      <Line type="monotone" dataKey="bloodPressure.systolic" stroke="#2563eb" strokeWidth={3} name="systolic" />
                      <Line type="monotone" dataKey="bloodPressure.diastolic" stroke="#7c3aed" strokeWidth={3} name="diastolic" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Sleep and Steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-purple-600" />
                    Sleep Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis domain={[4, 10]} />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Area type="monotone" dataKey="sleepHours" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="w-5 h-5 text-green-600" />
                    Daily Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <Bar dataKey="steps" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {healthGoals.map((goal) => (
                <Card key={goal.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)} Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{goal.current}/{goal.target} {goal.unit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round((goal.current / goal.target) * 100)}% complete
                      </p>
                    </div>

                    {/* Progress Update Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateGoalProgress(goal.id, goal.current - 1)}
                        disabled={goal.current <= 0}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={goal.current}
                        onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value) || 0)}
                        className="h-8 w-20 text-center"
                        min="0"
                        max={goal.target}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateGoalProgress(goal.id, goal.current + 1)}
                        disabled={goal.current >= goal.target}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                      <span className="text-xs text-muted-foreground ml-2">Update Progress</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Due: {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {goal.current >= goal.target && (
                          <Badge className="bg-green-500 animate-pulse">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Goal Achieved! 🎉
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHealthGoals(prev => prev.filter(g => g.id !== goal.id))}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Goal Setting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Set New Health Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => handleCreateGoal('steps')}
                  >
                    <Footprints className="w-4 h-4" />
                    Steps Goal
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    onClick={() => handleCreateGoal('sleep')}
                  >
                    <Moon className="w-4 h-4" />
                    Sleep Goal
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-green-50 hover:border-green-300 transition-colors"
                    onClick={() => handleCreateGoal('exercise')}
                  >
                    <Activity className="w-4 h-4" />
                    Exercise Goal
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                    onClick={() => handleCreateGoal('weight')}
                  >
                    <Heart className="w-4 h-4" />
                    Weight Goal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Goal Setting Modal */}
            <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Set New {newGoal.type.charAt(0).toUpperCase() + newGoal.type.slice(1)} Goal
                  </DialogTitle>
                  <DialogDescription>
                    Create a personalized health goal to track your progress and stay motivated.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target Value</Label>
                    <Input
                      id="target"
                      type="number"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
                      placeholder={`Enter your ${newGoal.type} target`}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit of Measurement</Label>
                    <Select
                      value={newGoal.unit}
                      onValueChange={(value) => setNewGoal(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steps">Steps</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="lbs">Pounds</SelectItem>
                        <SelectItem value="km">Kilometers</SelectItem>
                        <SelectItem value="miles">Miles</SelectItem>
                        <SelectItem value="calories">Calories</SelectItem>
                        <SelectItem value="glasses">Glasses of Water</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Target Date</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveGoal}
                    disabled={!newGoal.target || !newGoal.deadline || !newGoal.unit}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Create Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t.recentHealthReports}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{report.assessment}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.date).toLocaleDateString()} • {report.symptoms.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(report.severity)}
                        <Button variant="outline" size="sm">
                          {t.viewDetails}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Goal Achievement Celebration */}
      {celebrationGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center max-w-md mx-4 animate-in zoom-in-95 duration-300">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Goal Achieved!</h2>
            <p className="text-muted-foreground mb-4">
              Congratulations! You've successfully completed your health goal.
            </p>
            <div className="flex gap-2 justify-center">
              <span className="text-2xl">🏆</span>
              <span className="text-2xl">⭐</span>
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;