import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { io } from "socket.io-client";

// Components
import { Header } from "@/components/dashboard/Header";
import { DashboardHeader } from "@/components/dashboard/Connectioncard"; 
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LatencyChart } from "@/components/dashboard/LatencyChart";
import { RouteTable } from "@/components/dashboard/RouteTable";
import { LiveLogs } from "@/components/dashboard/LiveLogs";

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
  sourcePort?: number;
}

interface LatencyDataPoint {
  time: string;
  latency: number;
}

export default function Index() {
  const isFetching = useRef(false);

  const [draftApi] = useState(
    () =>   "https://routesense.onrender.com/api"
  );

  const [apiBase] = useState(draftApi);
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [summary, setSummary] = useState<SummaryStat>({
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });
  const [routes, setRoutes] = useState<RouteAnalytics[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [latency, setLatency] = useState<LatencyDataPoint[]>([]);
  const socketRef = useRef<any>(null);

  const [collectorLatency, setCollectorLatency] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  // --- 1. Socket Connection Logic ---
  useEffect(() => {
    const base = apiBase.replace("/api", "");
    socketRef.current = io(base, { transports: ["websocket"] });
    return () => { socketRef.current?.disconnect(); };
  }, [apiBase]);

  // --- 2. Service Room Logic ---
  useEffect(() => {
    if (!socketRef.current) return;

    // Clear UI instantly when switching
    setLogs([]);
    setRoutes([]);
    setLatency([]);
    setSummary({ totalRequests: 0, avgResponseTime: 0, errorRate: 0 });

    if (selectedService) {
      socketRef.current.emit("join_service", selectedService);
    }
    return () => {
      if (selectedService) {
        socketRef.current.emit("leave_service", selectedService);
      }
    };
  }, [selectedService]);

  // --- 3. Socket Event Listener ---
  useEffect(() => {
    if (!socketRef.current) return;
    const handler = (metric: any) => {
      if (selectedService && metric.service !== selectedService) return;

      setLogs(prev => [metric, ...prev.slice(0, 24)]);
      setSummary(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1
      }));

      setLatency(prev => [
        ...prev.slice(-19),
        { time: new Date().toLocaleTimeString(), latency: metric.responseTime }
      ]);
    };

    socketRef.current.on("new_metric", handler);
    return () => { socketRef.current?.off("new_metric", handler); };
  }, [selectedService]);

  // --- 4. Service List Polling ---
  useEffect(() => {
    const load = () => {
      axios.get<string[]>(`${apiBase}/services`).then(res => {
        setServices(res.data);
      });
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // --- 5. Metrics Polling ---
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [apiBase, selectedService]);

  async function fetchMetrics() {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      await axios.get(apiBase.replace("/api", "") + "/health");
      setIsConnected(true);

      const params = selectedService ? { service: selectedService } : {};

      const [summaryRes, routesRes, latencyRes, logsRes] = await Promise.all([
        axios.get<SummaryStat>(`${apiBase}/metrics/summary`, { params }),
        axios.get<RouteAnalytics[]>(`${apiBase}/metrics/routes`, { params }),
        axios.get<LatencyDataPoint[]>(`${apiBase}/metrics/latency`, { params }),
        axios.get<ApiLog[]>(`${apiBase}/metrics/export`, { params })
      ]);
      
      const start = performance.now();
      await axios.get(apiBase.replace("/api", "") + "/health");
      const latency = Math.round(performance.now() - start);

      setCollectorLatency(latency);
      setIsConnected(true);
      setLastHeartbeat(Date.now());
      setSummary(summaryRes.data);
      setRoutes(routesRes.data);
      setLatency(latencyRes.data);
      setLogs(logsRes.data);

    } catch {
      setIsConnected(false);
    } finally {
      isFetching.current = false;
    }
  }

  // --- 6. NEW: Clear Metrics Logic ---
  const clearMetrics = async () => {
    if (!selectedService) return;
    
    if (!window.confirm(`Are you sure you want to clear all history for ${selectedService}?`)) {
      return;
    }

    try {
      // Calls your new backend endpoint
      await axios.delete(`${apiBase}/metrics/clear/${selectedService}`);
      
      // Reset local state immediately so UI updates instantly
      setLogs([]);
      setRoutes([]);
      setLatency([]);
      setSummary({ totalRequests: 0, avgResponseTime: 0, errorRate: 0 });
      
    } catch (err) {
      console.error("Failed to clear metrics", err);
      // Optional: Add a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={isConnected} />

      {/* UPDATED: Passing the onClear prop now */}
      <DashboardHeader 
        apiBase={apiBase}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        isConnected={isConnected}
        collectorLatency={collectorLatency}
        services={services}
        onClear={clearMetrics} 
      />
      
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