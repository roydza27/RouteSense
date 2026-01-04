import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RouteTable } from "@/components/dashboard/RouteTable";
import { LiveLogs } from "@/components/dashboard/LiveLogs";
import { mockMetricsSummary, mockApiLogs, mockLatencyData, } from '@/lib/mockData';
import { RouteAnalytics } from "@/lib/mockData";

const API_BASE = "http://localhost:3001/api/metrics";

interface RouteStat {
  id: number;
  route: string;
  method: string;
  hits: number;
  avgTime: number;
  errorPercent: number;
  status: string;
  isSlow?: boolean;
}

interface SummaryStat {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
}

export default function Index() {

  
  const [isConnected, setIsConnected] = useState(false);
  const [summary, setSummary] = useState<SummaryStat>({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });
  const [routes, setRoutes] = useState<RouteAnalytics[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [latency, setLatency] = useState<any[]>([]);


  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const isNoise = (route: string) =>
    !route ||
    route.includes("favicon") ||
    route.includes("/metrics") ||
    route.startsWith("/api/metrics");

  async function fetchMetrics() {
    try {
      // Health check using an actual existing endpoint
      await axios.get("http://localhost:3001/api/metrics/summary");
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      return;
    }

    try {
      const s = await axios.get<SummaryStat>(`${API_BASE}/summary`);
      setSummary(s.data);

      const r = await axios.get(`${API_BASE}/routes`);
      const data = Array.isArray(r.data) ? r.data : [];

      const formattedRoutes = data
        .filter((m) => !isNoise(m.route))
        .map((m) => {
          const avg = m.avgResponseTime ?? m.avgTime ?? 0;
          return {
            id: (m.id ?? Date.now()).toString(), // ✅ FIX HERE
            route: m.route,
            method: m.method ?? "GET",
            hits: m.hits ?? m.requestCount ?? 0,
            avgTime: avg,
            errorPercent: m.errorPercent ?? 0,
            status: avg > 500 ? "slow" : "normal",
            isSlow: avg > 500,
          };
        });

      setRoutes(formattedRoutes);


      const l = await axios.get(`${API_BASE}/latency`);
      setLatency(Array.isArray(l.data) ? l.data : []);

      const logRes = await axios.get(`${API_BASE}/export`);
      setLogs(Array.isArray(logRes.data) ? logRes.data : []);

    } catch (err) {
      console.error("Metrics fetch error", err);
    }
  }


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
            value={summary.totalRequests.toLocaleString()}
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
        {/* <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <LatencyChart data={mockLatencyData} />
          <LiveLogs logs={mockApiLogs} />
        </div> */}

        {/* Route Analytics Table */}
        <RouteTable routes={routes} />
      </main>
    </div>
  );
};