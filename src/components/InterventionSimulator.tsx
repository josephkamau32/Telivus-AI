import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Pill,
  Heart,
  Brain,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface InterventionScenario {
  scenario_name: string;
  intervention_changes: {
    type: string;
    name: string;
    description: string;
    dosage?: any;
    schedule?: any;
  };
  assumption_parameters: {
    adherence_rate: number;
    effect_delay_days: number;
    peak_effect_day: number;
    sustained_effect_percentage: number;
    side_effect_probability: number;
  };
  simulated_trajectory: Array<{
    day: number;
    simulated_value: number;
    baseline_value: number;
    improvement: number;
    timestamp: string;
  }>;
  risk_changes: { [condition: string]: number };
  probability_improvement: number;
  expected_value: number;
  recommendation_strength: number;
}

interface InterventionSimulatorProps {
  baselineTrajectory: Array<{
    day: number;
    predicted_value: number;
    confidence_lower: number;
    confidence_upper: number;
    timestamp: string;
  }>;
  scenarios: InterventionScenario[];
  onScenarioSelect?: (scenario: InterventionScenario) => void;
  className?: string;
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  baselineTrajectory,
  scenarios,
  onScenarioSelect,
  className = ""
}) => {
  const [selectedScenario, setSelectedScenario] = useState<InterventionScenario | null>(
    scenarios.length > 0 ? scenarios[0] : null
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const handleScenarioChange = (scenarioName: string) => {
    const scenario = scenarios.find(s => s.scenario_name === scenarioName);
    if (scenario) {
      setSelectedScenario(scenario);
      onScenarioSelect?.(scenario);
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'medication': return <Pill className="w-4 h-4" />;
      case 'lifestyle': return <Heart className="w-4 h-4" />;
      case 'therapy': return <Brain className="w-4 h-4" />;
      case 'monitoring': return <Activity className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getRecommendationColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (strength >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (strength >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRecommendationLabel = (strength: number) => {
    if (strength >= 0.8) return 'Strongly Recommended';
    if (strength >= 0.6) return 'Recommended';
    if (strength >= 0.4) return 'Consider';
    return 'Not Recommended';
  };

  const calculateOverallImprovement = (scenario: InterventionScenario) => {
    const improvements = scenario.simulated_trajectory.map(p => p.improvement);
    return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  };

  const simulateScenario = async (scenario: InterventionScenario) => {
    setIsSimulating(true);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSimulating(false);
  };

  const scenarioComparison = useMemo(() => {
    if (!selectedScenario) return null;

    const baselineAvg = baselineTrajectory.reduce((sum, p) => sum + p.predicted_value, 0) / baselineTrajectory.length;
    const scenarioAvg = selectedScenario.simulated_trajectory.reduce((sum, p) => sum + p.simulated_value, 0) / selectedScenario.simulated_trajectory.length;

    return {
      baselineAverage: baselineAvg,
      scenarioAverage: scenarioAvg,
      improvement: baselineAvg - scenarioAvg,
      percentImprovement: ((baselineAvg - scenarioAvg) / baselineAvg) * 100
    };
  }, [selectedScenario, baselineTrajectory]);

  if (!scenarios.length) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No intervention scenarios available</p>
            <p className="text-sm">Complete a health assessment to generate personalized interventions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Intervention Simulator
        </CardTitle>
        <CardDescription>
          Explore how different interventions might affect your health trajectory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scenarios" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-4">
            {/* Scenario Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Scenario:</label>
              <Select
                value={selectedScenario?.scenario_name || ""}
                onValueChange={handleScenarioChange}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose intervention scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.scenario_name} value={scenario.scenario_name}>
                      <div className="flex items-center gap-2">
                        {getInterventionIcon(scenario.intervention_changes.type)}
                        {scenario.scenario_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedScenario && simulateScenario(selectedScenario)}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>

            {/* Selected Scenario Details */}
            {selectedScenario && (
              <div className="space-y-4">
                {/* Intervention Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getInterventionIcon(selectedScenario.intervention_changes.type)}
                        <CardTitle className="text-lg">{selectedScenario.intervention_changes.name}</CardTitle>
                      </div>
                      <Badge className={getRecommendationColor(selectedScenario.recommendation_strength)}>
                        {getRecommendationLabel(selectedScenario.recommendation_strength)}
                      </Badge>
                    </div>
                    <CardDescription>{selectedScenario.intervention_changes.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Success Probability:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={selectedScenario.probability_improvement * 100} className="flex-1" />
                          <span>{(selectedScenario.probability_improvement * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Expected Improvement:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          <span>{selectedScenario.expected_value.toFixed(1)} points</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Simulation Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Simulation Results</CardTitle>
                    <CardDescription>
                      Projected health trajectory with this intervention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {calculateOverallImprovement(selectedScenario).toFixed(1)}
                          </div>
                          <div className="text-sm text-blue-600">Avg Improvement</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {(selectedScenario.probability_improvement * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-green-600">Success Rate</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(selectedScenario.risk_changes).length}
                          </div>
                          <div className="text-sm text-purple-600">Risk Factors</div>
                        </div>
                      </div>

                      {/* Risk Changes */}
                      {Object.keys(selectedScenario.risk_changes).length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Risk Assessment Changes:</h4>
                          <div className="space-y-2">
                            {Object.entries(selectedScenario.risk_changes).map(([condition, change]) => (
                              <div key={condition} className="flex items-center justify-between text-sm">
                                <span>{condition}:</span>
                                <div className="flex items-center gap-1">
                                  {change < 0 ? (
                                    <TrendingDown className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <TrendingUp className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className={change < 0 ? 'text-green-600' : 'text-red-600'}>
                                    {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assumptions */}
                      <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                        <strong>Simulation Assumptions:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Adherence Rate: {(selectedScenario.assumption_parameters.adherence_rate * 100).toFixed(0)}%</li>
                          <li>• Effect Delay: {selectedScenario.assumption_parameters.effect_delay_days} days</li>
                          <li>• Peak Effect: Day {selectedScenario.assumption_parameters.peak_effect_day}</li>
                          <li>• Sustained Effect: {(selectedScenario.assumption_parameters.sustained_effect_percentage * 100).toFixed(0)}%</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
                <CardDescription>
                  Compare all intervention scenarios side by side
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scenarios.map((scenario, index) => (
                    <div key={scenario.scenario_name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getInterventionIcon(scenario.intervention_changes.type)}
                          <span className="font-medium">{scenario.scenario_name}</span>
                        </div>
                        <Badge className={getRecommendationColor(scenario.recommendation_strength)}>
                          {getRecommendationLabel(scenario.recommendation_strength)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Success Rate</div>
                          <div className="font-medium">{(scenario.probability_improvement * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Improvement</div>
                          <div className="font-medium">{calculateOverallImprovement(scenario).toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Risk Reduction</div>
                          <div className="font-medium">
                            {Object.values(scenario.risk_changes).reduce((sum, change) => sum + Math.max(0, -change), 0).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedScenario(scenario);
                              onScenarioSelect?.(scenario);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};