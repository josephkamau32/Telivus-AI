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
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

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
  showBaseline?: boolean;
  showConfidenceInterval?: boolean;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  data,
  conditionName,
  confidenceScore,
  showBaseline = true,
  showConfidenceInterval = true,
  className = ""
}) => {
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      date: new Date(point.timestamp).toLocaleDateString(),
      dayLabel: `Day ${point.day}`
    }));
  }, [data]);

  const currentTrend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const first = data[0].predicted_value;
    const last = data[data.length - 1].predicted_value;
    const change = ((last - first) / first) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }, [data]);

  const getTrendIcon = () => {
    switch (currentTrend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = () => {
    if (confidenceScore >= 0.8) return 'text-green-600';
    if (confidenceScore >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{`Day ${data.day}`}</p>
          <p className="text-sm text-gray-600">{data.date}</p>
          <p className="text-blue-600 font-medium">
            {`Predicted: ${data.predicted_value.toFixed(1)}`}
          </p>
          {showConfidenceInterval && (
            <p className="text-sm text-gray-500">
              {`Range: ${data.confidence_lower.toFixed(1)} - ${data.confidence_upper.toFixed(1)}`}
            </p>
          )}
          {data.baseline_value && (
            <p className="text-green-600 text-sm">
              {`Baseline: ${data.baseline_value.toFixed(1)}`}
            </p>
          )}
          {data.improvement && (
            <p className={`text-sm ${data.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`Change: ${data.improvement > 0 ? '+' : ''}${data.improvement.toFixed(1)}`}
            </p>
          )}
        </div>
      );
    }
    return null;
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
              Predicted health progression over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getConfidenceColor()}>
              {Math.round(confidenceScore * 100)}% confidence
            </Badge>
            <Badge variant="secondary">
              {data.length} days
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 12 }}
                label={{ value: 'Severity Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />

              {showConfidenceInterval && (
                <Area
                  dataKey="confidence_upper"
                  stackId="1"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              )}

              {showConfidenceInterval && (
                <Area
                  dataKey="confidence_lower"
                  stackId="1"
                  stroke="none"
                  fill="white"
                  fillOpacity={1}
                />
              )}

              <Line
                type="monotone"
                dataKey="predicted_value"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
              />

              {showBaseline && chartData.some(d => d.baseline_value) && (
                <Line
                  type="monotone"
                  dataKey="baseline_value"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}

              <ReferenceLine y={5} stroke="#6b7280" strokeDasharray="2 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-600"></div>
              <span>Predicted</span>
            </div>
            {showConfidenceInterval && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-sm"></div>
                <span>Confidence Range</span>
              </div>
            )}
            {showBaseline && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-green-600 border-dashed"></div>
                <span>Baseline</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span>Reference line at moderate severity</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};