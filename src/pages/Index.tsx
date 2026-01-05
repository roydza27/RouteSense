import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RouteTable } from "@/components/dashboard/RouteTable";
import { LiveLogs } from "@/components/dashboard/LiveLogs";

const API_BASE = "http://localhost:3002/api/metrics";

interface RouteAnalytics {
  id: string;
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

interface ApiLog {
  id: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  isError: boolean;
  timestamp: string;
}

interface LatencyDataPoint {
  time: string;
  latency: number;
}

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [summary, setSummary] = useState<SummaryStat>({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });

  const [routes, setRoutes] = useState<RouteAnalytics[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [latency, setLatency] = useState<LatencyDataPoint[]>([]);

  const sampleMetrics: RouteAnalytics[] = [
    { id: "get-api-users", route: "/api/users", method: "GET", hits: 120, avgTime: 230, errorPercent: 0, status: "normal" },
    { id: "post-api-login", route: "/api/login", method: "POST", hits: 80, avgTime: 420, errorPercent: 2.5, status: "normal" },
    { id: "get-api-data", route: "/api/data", method: "GET", hits: 40, avgTime: 900, errorPercent: 5, status: "slow", isSlow: true }
  ];

  const sampleLatency: LatencyDataPoint[] = [
    { time: "10:01:22", latency: 220 },
    { time: "10:01:25", latency: 480 },
    { time: "10:01:27", latency: 1100 }
  ];

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      await axios.get(`${API_BASE}/summary`);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      return;
    }

    try {
      const summaryRes = await axios.get<SummaryStat>(`${API_BASE}/summary`);
      setSummary(summaryRes.data);

      const routesRes = await axios.get<RouteAnalytics[]>(`${API_BASE}/routes`);
      const uniqueRoutes = Array.from(new Map(routesRes.data.map(r => [r.id, r])).values());
      setRoutes(uniqueRoutes);

      const latencyRes = await axios.get<LatencyDataPoint[]>(`${API_BASE}/latency?limit=20`);
      setLatency(latencyRes.data);

      const logsRes = await axios.get<ApiLog[]>(`${API_BASE}/export?limit=50`);

      const formattedLogs = logsRes.data.map(log => ({
        id: log.id,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        isError: log.isError,
        timestamp: log.timestamp
      }));

      setLogs(formattedLogs);

    } catch (err) {
      console.error("Metrics fetch error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={isConnected} />

      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <h2 className="text-2xl font-bold">API Metrics</h2>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total API Calls" value={summary.totalRequests.toString()} icon={Activity} variant="default"/>
          <MetricCard title="Avg Response Time" value={summary.avgResponseTime.toString()} unit="ms" icon={Clock} variant="default"/>
          <MetricCard title="Error Rate" value={summary.errorRate.toString()} unit="%" icon={AlertTriangle} variant="destructive"/>
          <MetricCard title="Success Rate" value={(100 - summary.errorRate).toFixed(2)} unit="%" icon={CheckCircle2} variant="success"/>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <LatencyChart data={sampleLatency} />
          <LiveLogs logs={sampleMetrics} />
        </div>

        <RouteTable routes={routes} />
      </main>
    </div>
  );
}
