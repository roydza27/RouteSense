import { Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LatencyChart } from '@/components/dashboard/LatencyChart';
import { RouteTable } from '@/components/dashboard/RouteTable';
import { LiveLogs } from '@/components/dashboard/LiveLogs';
import {
  mockMetricsSummary,
  mockRouteAnalytics,
  mockApiLogs,
  mockLatencyData,
} from '@/lib/mockData';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={true} />

      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-muted-foreground">
            Backend observability dashboard for tracking API performance, latency, and errors
          </p>
        </div>

        {/* Metrics Summary Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total API Calls"
            value={mockMetricsSummary.totalApiCalls.toLocaleString()}
            trend={mockMetricsSummary.trend.calls}
            icon={Activity}
            variant="default"
          />
          <MetricCard
            title="Avg Response Time"
            value={mockMetricsSummary.avgResponseTime}
            unit="ms"
            trend={mockMetricsSummary.trend.responseTime}
            icon={Clock}
            variant="default"
          />
          <MetricCard
            title="Error Rate"
            value={mockMetricsSummary.errorRate}
            unit="%"
            trend={mockMetricsSummary.trend.errorRate}
            icon={AlertTriangle}
            variant="destructive"
          />
          <MetricCard
            title="Success Rate"
            value={mockMetricsSummary.successRate}
            unit="%"
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Charts and Logs Grid */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <LatencyChart data={mockLatencyData} />
          <LiveLogs logs={mockApiLogs} />
        </div>

        {/* Route Analytics Table */}
        <RouteTable routes={mockRouteAnalytics} />
      </main>
    </div>
  );
};

export default Index;
