import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  AlertCircle
} from 'lucide-react';
import { TrajectoryChart } from './TrajectoryChart';

interface SimulationScenario {
  scenario_name: string;
  intervention_changes: any;
  assumption_parameters: any;
  simulated_trajectory: any[];
  risk_changes: Record<string, number>;
  probability_improvement: number;
  expected_value: number;
  recommendation_strength: number;
}

interface InterventionSimulatorProps {
  scenarios: SimulationScenario[];
  baselineTrajectory: any[];
  conditionName: string;
  onScenarioSelect?: (scenario: SimulationScenario) => void;
  className?: string;
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  scenarios,
  baselineTrajectory,
  conditionName,
  onScenarioSelect,
  className = ""
}) => {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(
    scenarios.length > 0 ? scenarios[0] : null
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const sortedScenarios = useMemo(() => {
    return [...scenarios].sort((a, b) => b.recommendation_strength - a.recommendation_strength);
  }, [scenarios]);

  const getInterventionIcon = (scenarioName: string) => {
    const name = scenarioName.toLowerCase();
    if (name.includes('medication') || name.includes('pill')) {
      return <Pill className="w-4 h-4" />;
    }
    if (name.includes('therapy') || name.includes('cognitive') || name.includes('behavioral')) {
      return <Brain className="w-4 h-4" />;
    }
    if (name.includes('lifestyle') || name.includes('exercise') || name.includes('diet')) {
      return <Activity className="w-4 h-4" />;
    }
    return <Heart className="w-4 h-4" />;
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600';
    if (probability >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getExpectedValueColor = (value: number) => {
    if (value >= 1.0) return 'text-green-600';
    if (value >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatInterventionDetails = (changes: any) => {
    if (!changes) return "Standard intervention protocol";

    const details = [];
    if (changes.type) details.push(changes.type);
    if (changes.name) details.push(changes.name);
    if (changes.dosage) details.push(`Dosage: ${changes.dosage}`);
    if (changes.schedule) details.push(`Schedule: ${changes.schedule}`);

    return details.join(' • ') || "Custom intervention plan";
  };

  const simulateScenario = async (scenario: SimulationScenario) => {
    setIsSimulating(true);
    setSelectedScenario(scenario);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSimulating(false);
    onScenarioSelect?.(scenario);
  };

  const resetSimulation = () => {
    setSelectedScenario(scenarios.length > 0 ? scenarios[0] : null);
  };

  if (scenarios.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No intervention scenarios available</p>
            <p className="text-sm">Complete more health assessments to generate personalized interventions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Intervention Simulator
        </CardTitle>
        <CardDescription>
          Explore different treatment approaches and their predicted outcomes for {conditionName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scenarios" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-4">
            <div className="grid gap-4">
              {sortedScenarios.map((scenario, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedScenario?.scenario_name === scenario.scenario_name
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getInterventionIcon(scenario.scenario_name)}
                        <div>
                          <h4 className="font-medium">{scenario.scenario_name}</h4>
                          <p className="text-sm text-gray-600">
                            {formatInterventionDetails(scenario.intervention_changes)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={scenario.recommendation_strength >= 0.7 ? "default" : "secondary"}
                      >
                        {Math.round(scenario.recommendation_strength * 100)}% recommended
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getProbabilityColor(scenario.probability_improvement)}`}>
                          {Math.round(scenario.probability_improvement * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">Success Probability</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${getExpectedValueColor(scenario.expected_value)}`}>
                          {scenario.expected_value >= 0 ? '+' : ''}{scenario.expected_value.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">Expected Improvement</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {Object.entries(scenario.risk_changes).map(([condition, change]) => (
                          <div key={condition} className="flex items-center gap-1">
                            {change < 0 ? (
                              <TrendingDown className="w-3 h-3 text-green-500" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-red-500" />
                            )}
                            <span className={change < 0 ? 'text-green-600' : 'text-red-600'}>
                              {condition}: {change > 0 ? '+' : ''}{change.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant={selectedScenario?.scenario_name === scenario.scenario_name ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          simulateScenario(scenario);
                        }}
                        disabled={isSimulating}
                      >
                        {isSimulating && selectedScenario?.scenario_name === scenario.scenario_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            Simulating...
                          </div>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Simulate
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            {selectedScenario ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    Comparing: {selectedScenario.scenario_name}
                  </h3>
                  <Button variant="outline" size="sm" onClick={resetSimulation}>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>

                <TrajectoryChart
                  data={selectedScenario.simulated_trajectory}
                  conditionName={`${conditionName} - ${selectedScenario.scenario_name}`}
                  confidenceScore={0.75}
                  showBaseline={true}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Success Probability</span>
                      </div>
                      <div className={`text-2xl font-bold ${getProbabilityColor(selectedScenario.probability_improvement)}`}>
                        {Math.round(selectedScenario.probability_improvement * 100)}%
                      </div>
                      <Progress
                        value={selectedScenario.probability_improvement * 100}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Expected Improvement</span>
                      </div>
                      <div className={`text-2xl font-bold ${getExpectedValueColor(selectedScenario.expected_value)}`}>
                        {selectedScenario.expected_value >= 0 ? '+' : ''}{selectedScenario.expected_value.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Symptom severity reduction
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">Risk Changes</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(selectedScenario.risk_changes).map(([condition, change]) => (
                          <div key={condition} className="flex justify-between text-sm">
                            <span>{condition}:</span>
                            <span className={change < 0 ? 'text-green-600' : 'text-red-600'}>
                              {change > 0 ? '+' : ''}{change.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a scenario to view detailed comparison</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};