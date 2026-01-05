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
      const summaryRes = await axios.get<any>(`${API_BASE}/metrics/summary`);
      setSummary({
        totalRequests: summaryRes.data.totalRequests ?? 0,
        avgResponseTime: summaryRes.data.avgResponseTime ?? 0,
        errorRate: summaryRes.data.errorRate ?? 0,
      });

      const routesRes = await axios.get<any[]>(`${API_BASE}/metrics/routes`);
      const formattedRoutes = routesRes.data.map(r => ({
        id: `${r.method.toLowerCase()}-${r.route.replace(/[^a-zA-Z0-9]/g, "-")}`,
        route: r.route,
        method: r.method,
        hits: r.hits ?? 0,
        avgTime: Math.round(r.avgResponseTime ?? r.response_time ?? 0),
        errorPercent: parseFloat(r.errorRate ?? 0),
        status: (r.avgResponseTime ?? 0) > 500 ? "slow" : "normal",
        isSlow: (r.avgResponseTime ?? 0) > 500,
      }));
      setRoutes(formattedRoutes);

      const latencyRes = await axios.get<any[]>(`${API_BASE}/metrics/latency?limit=20`);
      const formattedLatency = latencyRes.data.map(p => ({
        time: p.time,
        latency: p.latency ?? p.responseTime ?? p.response_time ?? 0,
        route: p.route,
        method: p.method,
      }));
      setLatency(formattedLatency);

      const logsRes = await axios.get<any[]>(`${API_BASE}/metrics/export?limit=25`);
      const formattedLogs = logsRes.data.map(log => ({
        id: log.id,
        route: log.endpoint ?? log.route,
        method: log.method,
        status: log.statusCode ?? log.status ?? 200,
        responseTime: log.responseTime ?? log.response_time ?? 0,
        isError: log.isError === 1 || log.is_error === 1 || log.isError === true,
        timestamp: log.timestamp,
        sourcePort: log.sourcePort ?? log.source_port ?? 0,
      }));
      setLogs(formattedLogs);


      // Optional: generate some traffic so UI fills up
      axios.get(`${API_PROXY}/test/slow`).catch(() => { });
      axios.get(`${API_PROXY}/test/fast`).catch(() => { });
      axios.post(`${API_PROXY}/repo/status`, {
        workspacePath: "C:/Users/royal/Documents/Daily-Plan-Projects/metric-heartbeat"
      }).catch(() => { });

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
