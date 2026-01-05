import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RouteTable } from "@/components/dashboard/RouteTable";
import { LiveLogs } from "@/components/dashboard/LiveLogs";

const API_BASE = "http://localhost:3002/api";

const API_PROXY = "http://localhost:4001/api"; // proxy for making requests

interface RouteAnalytics {
  id: string;
  route: string;
  method: string;
  hits: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
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
  sourcePort: number;
}




interface LatencyDataPoint {
  time: string;
  latency: number;
}

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const ts = new Date(); // or remove it if unused
  const [summary, setSummary] = useState<SummaryStat>({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });
  const [routes, setRoutes] = useState<RouteAnalytics[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [latency, setLatency] = useState<LatencyDataPoint[]>([]);

  useEffect(() => {
    console.log("Inside the use effect");
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);

  }, []);

  useEffect(() => {
    console.log("Inside the use effect 2");
  }, [])

  async function fetchMetrics() {
    // Health check: confirm collector DB has at least 1 row
    try {
      const health = await axios.get<ApiLog[]>(`${API_BASE}/metrics/export?limit=1`);


      setIsConnected(health.data.length > 0);
    } catch {
      setIsConnected(false);
      return;
    }

    try {
      // 1. Summary
      const summaryRes = await axios.get<SummaryStat>(`${API_BASE}/metrics/summary`);
      setSummary({
        totalRequests: summaryRes.data.totalRequests ?? 0,
        avgResponseTime: summaryRes.data.avgResponseTime ?? 0,
        errorRate: summaryRes.data.errorRate ?? 0,
      });

      // 2. Routes 
      const routesRes = await axios.get<RouteAnalytics[]>(`${API_BASE}/metrics/routes`);
      const formattedRoutes = routesRes.data.map(r => ({
        id: r.id,
        route: r.route,
        method: r.method,
        hits: r.hits,
        avgTime: r.avgTime,
        maxTime: r.maxTime,
        minTime: r.minTime,
        errorPercent: r.errorPercent,
        status: r.status,
        isSlow: r.isSlow,
      }));
      setRoutes(formattedRoutes);

      const latencyRes = await axios.get<LatencyDataPoint[]>(`${API_BASE}/metrics/latency?limit=20`);
      setLatency(latencyRes.data);

      const logsRes = await axios.get<any[]>(`${API_BASE}/metrics/export?limit=25`);
      setLogs(
        logsRes.data.map(x => ({
          id: x.id,
          route: x.endpoint ?? x.route ?? "/",
          method: x.method ?? "GET",
          status: x.statusCode ?? x.status ?? 200,
          responseTime: x.responseTime ?? x.response_time ?? 0,
          isError: Boolean(x.isError ?? x.is_error ?? false),
          timestamp: new Date(x.timestamp).toLocaleTimeString("en-IN", { hour12: false }),
          sourcePort: x.sourcePort ?? x.source_port ?? 0,
        }))
      );






    } catch (err) {
      console.error("Metrics fetch failed:", err);
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
          <MetricCard title="Error Rate" value={summary.errorRate.toFixed(2)} unit="%" icon={AlertTriangle} />
          <MetricCard title="Success Rate" value={(100 - summary.errorRate).toFixed(2)} unit="%" icon={CheckCircle2} />
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
