import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LatencyDataPoint } from '@/lib/mockData';

interface LatencyChartProps {
  data: LatencyDataPoint[];
}

export const LatencyChart = ({ data }: LatencyChartProps) => {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">API Latency Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Response time trends with 500ms threshold indicator
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(226, 71%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(226, 71%, 55%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value: number) => [`${value}ms`, 'Latency']}
              />
              <ReferenceLine
                y={500}
                stroke="hsl(0, 84%, 60%)"
                strokeDasharray="5 5"
                label={{
                  value: 'Threshold',
                  position: 'right',
                  fill: 'hsl(0, 84%, 60%)',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="hsl(226, 71%, 55%)"
                strokeWidth={2}
                fill="url(#latencyGradient)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.latency > 500) {
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="hsl(0, 84%, 60%)"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
