import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Brain, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';

interface ReasoningNode {
  id: string;
  type: string;
  label: string;
  description: string;
  confidence_score: number;
  evidence_sources: string[];
  metadata: Record<string, any>;
}

interface ReasoningEdge {
  source_id: string;
  target_id: string;
  relationship_type: string;
  strength: number;
  explanation: string;
}

interface ReasoningGraphData {
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
  root_symptoms: string[];
  final_diagnosis?: string;
  triage_level: string;
  reasoning_summary: string;
}

interface ReasoningGraphProps {
  graph: ReasoningGraphData;
}

const ReasoningGraph = memo(({ graph }: ReasoningGraphProps) => {
  // Data validation
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return (
      <Card className="w-full border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Reasoning Graph Unavailable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The AI reasoning data could not be loaded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewStartTime] = useState(Date.now());

  // Analytics: Track component view
  useEffect(() => {
    // Track reasoning graph view
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'reasoning_graph_view', {
        event_category: 'feature_interaction',
        event_label: 'reasoning_graph',
        triage_level: graph.triage_level,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length
      });
    }

    // Track view duration on unmount
    return () => {
      const viewDuration = Date.now() - viewStartTime;
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'reasoning_graph_view_duration', {
          event_category: 'feature_interaction',
          event_label: 'reasoning_graph',
          value: viewDuration
        });
      }
    };
  }, [graph.triage_level, graph.nodes.length, graph.edges.length, viewStartTime]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(nodeId);

      if (wasExpanded) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }

      // Analytics: Track node expansion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', wasExpanded ? 'reasoning_graph_node_collapse' : 'reasoning_graph_node_expand', {
          event_category: 'feature_interaction',
          event_label: nodeId,
          node_type: graph.nodes.find(n => n.id === nodeId)?.type || 'unknown'
        });
      }

      return newSet;
    });
  }, [graph.nodes]);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, ReasoningNode[]> = {};
    graph.nodes.forEach(node => {
      if (!groups[node.type]) {
        groups[node.type] = [];
      }
      groups[node.type].push(node);
    });
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
    });
    return groups;
  }, [graph.nodes]);

  // Get triage icon
  const getTriageIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'urgent':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'routine':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Brain className="w-4 h-4 text-blue-600" />;
    }
  };

  // Get relationship label
  const getRelationshipLabel = (type: string) => {
    const labels = {
      supports: 'Supports',
      causes: 'Causes',
      rules_out: 'Rules Out',
      related: 'Related',
      evidence: 'Evidence'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Reasoning Graph
          <Badge variant="outline" className="ml-auto">
            {getTriageIcon(graph.triage_level || 'routine')}
            <span className="ml-1 capitalize">{graph.triage_level || 'routine'}</span>
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{graph.reasoning_summary || 'AI reasoning analysis completed'}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Symptoms Section */}
        {groupedNodes.symptom && groupedNodes.symptom.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Reported Symptoms
              <Badge variant="secondary" className="text-xs">
                {groupedNodes.symptom.length}
              </Badge>
            </h3>
            <div className="grid gap-3">
              {groupedNodes.symptom.map((symptom, index) => (
                <Card
                  key={symptom.id}
                  className="border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">{symptom.label}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((symptom.confidence_score || 0) * 100)}% confidence
                          </Badge>
                        </div>

                        {/* Confidence Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Confidence Level</span>
                            <span>{Math.round((symptom.confidence_score || 0) * 100)}%</span>
                          </div>
                          <Progress
                            value={(symptom.confidence_score || 0) * 100}
                            className="h-2"
                          />
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">{symptom.description}</p>

                        {symptom.evidence_sources && symptom.evidence_sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs text-muted-foreground mr-2">Evidence:</span>
                            {symptom.evidence_sources.map((source, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Conditions/Diagnoses Section */}
        {groupedNodes.condition && groupedNodes.condition.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Possible Conditions
            </h3>
            <div className="grid gap-3">
              {groupedNodes.condition.map(condition => (
                <Card key={condition.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{condition.label}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((condition.confidence_score || 0) * 100)}% confidence
                          </Badge>
                          {graph.final_diagnosis === condition.id && (
                            <Badge className="bg-green-600 text-xs">Final Diagnosis</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                        {condition.evidence_sources && condition.evidence_sources.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Evidence: {condition.evidence_sources.join(', ')}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleNode(condition.id)}
                        className="ml-2"
                      >
                        {expandedNodes.has(condition.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {expandedNodes.has(condition.id) && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium mb-2">Supporting Relationships:</h5>
                        <div className="space-y-2">
                          {graph.edges
                            .filter(edge => edge && edge.target_id === condition.id)
                            .map(edge => {
                              const sourceNode = graph.nodes.find(n => n && n.id === edge.source_id);
                              return (
                                <div key={`${edge.source_id}-${edge.target_id}`} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {getRelationshipLabel(edge.relationship_type || 'related')}
                                  </Badge>
                                  <span className="text-muted-foreground">from</span>
                                  <span className="font-medium">{sourceNode?.label || 'Unknown'}</span>
                                  <span className="text-muted-foreground">({Math.round((edge.strength || 0) * 100)}% strength)</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors Section */}
        {groupedNodes.factor && groupedNodes.factor.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              Risk Factors & Contributing Elements
            </h3>
            <div className="grid gap-3">
              {groupedNodes.factor.map(factor => (
                <Card key={factor.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{factor.label}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((factor.confidence_score || 0) * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{factor.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Reasoning Summary
            </h4>
            <p className="text-sm text-muted-foreground">{graph.reasoning_summary}</p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
});

export default ReasoningGraph;