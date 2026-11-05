import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart
} from 'recharts';
import { WardForecast } from '../../lib/api/forecast.api';

interface ForecastChartProps {
  forecast: WardForecast;
  className?: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ forecast, className = '' }) => {
  const h1 = forecast.horizons.h1 || forecast.horizons['1h'];
  const h3 = forecast.horizons.h3 || forecast.horizons['3h'];
  const h6 = forecast.horizons.h6 || forecast.horizons['6h'];

  const data = [
    {
      horizon: 'Now',
      expectedFree: forecast.currentFree,
      probability: forecast.currentFree > 0 ? 100 : 0
    },
    {
      horizon: '+1 Hour',
      expectedFree: Number((h1?.expectedFree ?? 0).toFixed(1)),
      probability: Math.round((h1?.probabilityAtLeastOneFree ?? 0) * 100)
    },
    {
      horizon: '+3 Hours',
      expectedFree: Number((h3?.expectedFree ?? 0).toFixed(1)),
      probability: Math.round((h3?.probabilityAtLeastOneFree ?? 0) * 100)
    },
    {
      horizon: '+6 Hours',
      expectedFree: Number((h6?.expectedFree ?? 0).toFixed(1)),
      probability: Math.round((h6?.probabilityAtLeastOneFree ?? 0) * 100)
    }
  ];

  return (
    <div className={`p-4 bg-white rounded-card border border-hairline/80 shadow-xs text-left ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-ink">
            Availability Projections ({forecast.wardType} Ward)
          </h4>
          <p className="text-xs text-muted mt-0.5">
            Easy read: how many beds may free up, and your chance of getting one
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-blue">
            <span className="w-2.5 h-2.5 rounded-full bg-blue" />
            Expected Free
          </span>
          <span className="flex items-center gap-1 text-teal">
            <span className="w-2.5 h-2.5 rounded-full bg-teal" />
            Free Probability (%)
          </span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E3E3" />
            <XAxis
              dataKey="horizon"
              tickLine={false}
              axisLine={{ stroke: '#E3E3E3' }}
              tick={{ fontSize: 11, fill: '#8A8A8A' }}
            />
            <YAxis
              yAxisId="left"
              domain={[0, Math.max(5, forecast.capacity)]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8A8A8A' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8A8A8A' }}
              unit="%"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-surface p-2.5 rounded-xl border border-hairline shadow-float text-xs">
                      <p className="font-bold text-ink mb-1">{label}</p>
                      <p className="text-blue font-semibold">
                        Expected Free Beds: {payload[0]?.value}
                      </p>
                      <p className="text-teal font-semibold">
                        Free Probability: {payload[1]?.value}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="probability"
              fill="#E6F7F7"
              stroke="#0E9F9F"
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="expectedFree"
              stroke="#1E6FD9"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#1E6FD9', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

