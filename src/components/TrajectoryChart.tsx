import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrajectoryData {
  day: number;
  predicted_value: number;
  confidence_lower: number;
  confidence_upper: number;
  baseline_value?: number;
  improvement?: number;
  timestamp: string;
}

interface TrajectoryChartProps {
  data: TrajectoryData[];
  conditionName: string;
  confidenceScore: number;
  showConfidenceInterval?: boolean;
  showBaseline?: boolean;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  data,
  conditionName,
  confidenceScore,
  showConfidenceInterval = true,
  showBaseline = false,
  className = ""
}) => {
  const processedData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      day: `Day ${point.day}`,
      formattedDate: new Date(point.timestamp).toLocaleDateString(),
      severity: point.predicted_value > 7 ? 'high' :
               point.predicted_value > 5 ? 'medium' : 'low'
    }));
  }, [data]);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return '#10b981'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.formattedDate}</p>
          <p className="text-sm text-gray-600">
            Predicted Value: <span className="font-medium">{data.predicted_value.toFixed(1)}</span>
          </p>
          {showConfidenceInterval && (
            <p className="text-sm text-gray-600">
              Range: {data.confidence_lower.toFixed(1)} - {data.confidence_upper.toFixed(1)}
            </p>
          )}
          {data.baseline_value && (
            <p className="text-sm text-gray-600">
              Baseline: {data.baseline_value.toFixed(1)}
            </p>
          )}
          {data.improvement && (
            <p className="text-sm text-gray-600">
              Improvement: {data.improvement > 0 ? '+' : ''}{data.improvement.toFixed(1)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = () => {
    if (!data.length) return null;

    const firstValue = data[0].predicted_value;
    const lastValue = data[data.length - 1].predicted_value;
    const trend = lastValue - firstValue;

    if (Math.abs(trend) < 0.5) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-red-600" />;
    return <TrendingDown className="w-4 h-4 text-green-600" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon()}
              {conditionName} Trajectory
            </CardTitle>
            <CardDescription>
              {data.length}-day prediction with confidence intervals
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              style={{ borderColor: getConfidenceColor(confidenceScore) }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getConfidenceColor(confidenceScore) }}
              />
              {(confidenceScore * 100).toFixed(0)}% Confidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {showConfidenceInterval ? (
              <AreaChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Severity Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="confidence_upper"
                  stackId="1"
                  stroke="none"
                  fill="#e5e7eb"
                  fillOpacity={0.3}
                  name="Confidence Range"
                />
                <Area
                  type="monotone"
                  dataKey="confidence_lower"
                  stackId="1"
                  stroke="none"
                  fill="white"
                  fillOpacity={1}
                />

                {/* Main prediction line */}
                <Line
                  type="monotone"
                  dataKey="predicted_value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  name="Predicted Trajectory"
                />

                {/* Baseline comparison */}
                {showBaseline && (
                  <Line
                    type="monotone"
                    dataKey="baseline_value"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="Baseline"
                  />
                )}

                {/* Severity threshold lines */}
                <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="2 2" label="High" />
                <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="2 2" label="Medium" />
              </AreaChart>
            ) : (
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Severity Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="predicted_value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  name="Predicted Trajectory"
                />

                {showBaseline && (
                  <Line
                    type="monotone"
                    dataKey="baseline_value"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ef4444', r: 3 }}
                    name="Baseline"
                  />
                )}

                <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="2 2" label="High" />
                <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="2 2" label="Medium" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span>Predicted Trajectory</span>
          </div>
          {showConfidenceInterval && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-gray-200 rounded"></div>
              <span>Confidence Range</span>
            </div>
          )}
          {showBaseline && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 border-dashed border-t-2"></div>
              <span>Baseline</span>
            </div>
          )}
        </div>

        {/* Risk Assessment Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Risk Assessment</span>
            <Badge variant={confidenceScore >= 0.8 ? "default" : confidenceScore >= 0.6 ? "secondary" : "destructive"}>
              {confidenceScore >= 0.8 ? "Low Risk" : confidenceScore >= 0.6 ? "Medium Risk" : "High Risk"}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Based on {data.length} days of prediction data with {(confidenceScore * 100).toFixed(0)}% confidence
          </p>
        </div>
      </CardContent>
    </Card>
  );
};