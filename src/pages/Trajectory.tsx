import React from 'react';
import { TrajectoryDashboard } from '../components/TrajectoryDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Activity, TrendingUp, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Trajectory: React.FC = () => {
  const navigate = useNavigate();

  // Mock user ID - in a real app this would come from auth context
  const userId = "user_123";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Health Trajectory</h1>
                <p className="text-sm text-gray-600">AI-powered health prediction & intervention planning</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Predictive Analytics</h3>
                  <p className="text-sm text-gray-600">Forecast health trends using advanced ML models</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Intervention Simulation</h3>
                  <p className="text-sm text-gray-600">Test different treatment approaches virtually</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Personalized AI</h3>
                  <p className="text-sm text-gray-600">Adaptive recommendations based on your health data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trajectory Dashboard */}
        <TrajectoryDashboard
          userId={userId}
          onRefresh={() => {
            // Handle refresh if needed
            console.log('Refreshing trajectory data...');
          }}
        />

        {/* Additional Information */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Understanding your health trajectory analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                  <div>
                    <p className="font-medium">Data Collection</p>
                    <p className="text-sm text-gray-600">We analyze your health assessment history and symptom patterns over time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                  <div>
                    <p className="font-medium">AI Prediction</p>
                    <p className="text-sm text-gray-600">Advanced machine learning models predict how your health might progress.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">3</div>
                  <div>
                    <p className="font-medium">Intervention Planning</p>
                    <p className="text-sm text-gray-600">We recommend and simulate different treatment approaches.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">4</div>
                  <div>
                    <p className="font-medium">Continuous Learning</p>
                    <p className="text-sm text-gray-600">The AI adapts recommendations based on your responses and outcomes.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Notes</CardTitle>
              <CardDescription>Understanding the limitations and scope</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Not a substitute for professional care:</strong> This analysis is for informational purposes only.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Based on available data:</strong> Predictions improve with more health assessments over time.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Regular updates recommended:</strong> Complete new assessments to refine predictions.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Emergency situations:</strong> Always seek immediate medical attention for urgent symptoms.</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  This feature uses advanced AI algorithms including time-series forecasting,
                  ensemble machine learning, and causal inference models to provide personalized health insights.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Trajectory;