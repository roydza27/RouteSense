import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RouteTable } from "@/components/dashboard/RouteTable";
import { LiveLogs } from "@/components/dashboard/LiveLogs";

const API_BASE = "http://localhost:3002/api/metrics"; // collector API
const API_PROXY = "http://localhost:4001/api"; // proxy for making requests

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
  route: string;
  method: string;
  status: number;
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

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
    
  }, []);

  async function fetchMetrics() {
    // health check
    try {
      await axios.get(`${API_BASE}/summary`);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      return;
    }

    try {
      // summary stats
      const summaryRes = await axios.get<SummaryStat>(`${API_BASE}/summary`);
      setSummary(summaryRes.data);

      // unique route analytics
      const routesRes = await axios.get<RouteAnalytics[]>(`${API_BASE}/routes`);
      setRoutes(routesRes.data);

      // last 20 latency points
      const latencyRes = await axios.get<LatencyDataPoint[]>(`${API_BASE}/latency?limit=20`);
      setLatency(latencyRes.data);

      // latest 25 logs
      const logsRes = await axios.get(`${API_BASE}/export?limit=25`);

      // Assert the data is an array of raw logs
      const rawLogs = logsRes.data as { id: number; route: string; method: string; status: number; responseTime: number; isError: boolean | number; timestamp: string; }[];

      const formattedLogs: ApiLog[] = rawLogs.map((log) => ({
        id: log.id,
        route: log.route,
        method: log.method,
        status: log.status,
        responseTime: log.responseTime,
        isError: log.isError === 1 || log.isError === true,
        timestamp: log.timestamp,
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard Overview</h2>
          <p className="mt-1 text-muted-foreground">
            Real-time API observability – requests, latency & errors
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total API Calls" value={summary.totalRequests.toLocaleString()} icon={Activity} />
          <MetricCard title="Avg Response Time" value={summary.avgResponseTime.toString()} unit="ms" icon={Clock} />
          <MetricCard title="Error Rate" value={summary.errorRate.toFixed(2)} unit="%" icon={AlertTriangle} variant="destructive" />
          <MetricCard title="Success Rate" value={(100 - summary.errorRate).toFixed(2)} unit="%" icon={CheckCircle2} variant="success" />
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <LatencyChart data={latency} />
          <LiveLogs logs={logs} />
        </div>

        <RouteTable routes={routes} />
      </main>
    </div>
  );
}
