// Mock data for the metrics dashboard

export interface MetricsSummary {
  totalApiCalls: number;
  avgResponseTime: number;
  errorRate: number;
  successRate: number;
  trend: {
    calls: number;
    responseTime: number;
    errorRate: number;
  };
}

export interface RouteAnalytics {
  id: string;
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  hits: number;
  avgTime: number;
  errorPercent: number;
  status: 'slow' | 'normal';
}

export interface ApiLog {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  statusCode: number;
  responseTime: number;
  isError: boolean;
}

export interface LatencyDataPoint {
  time: string;
  latency: number;
  threshold: number;
}

export const mockMetricsSummary: MetricsSummary = {
  totalApiCalls: 24892,
  avgResponseTime: 187,
  errorRate: 2.3,
  successRate: 97.7,
  trend: {
    calls: 12.5,
    responseTime: -8.2,
    errorRate: -0.4,
  },
};

export const mockRouteAnalytics: RouteAnalytics[] = [
  { id: '1', route: '/api/users', method: 'GET', hits: 8542, avgTime: 124, errorPercent: 0.8, status: 'normal' },
  { id: '2', route: '/api/products', method: 'GET', hits: 6231, avgTime: 89, errorPercent: 0.3, status: 'normal' },
  { id: '3', route: '/api/orders', method: 'POST', hits: 4128, avgTime: 567, errorPercent: 3.2, status: 'slow' },
  { id: '4', route: '/api/auth/login', method: 'POST', hits: 3892, avgTime: 234, errorPercent: 4.1, status: 'normal' },
  { id: '5', route: '/api/payments', method: 'POST', hits: 2156, avgTime: 892, errorPercent: 2.8, status: 'slow' },
  { id: '6', route: '/api/analytics', method: 'GET', hits: 1847, avgTime: 456, errorPercent: 1.2, status: 'normal' },
  { id: '7', route: '/api/notifications', method: 'POST', hits: 1523, avgTime: 78, errorPercent: 0.5, status: 'normal' },
  { id: '8', route: '/api/reports/generate', method: 'POST', hits: 892, avgTime: 1245, errorPercent: 5.1, status: 'slow' },
];

const generateTimestamps = () => {
  const logs: ApiLog[] = [];
  const endpoints = [
    '/api/users',
    '/api/products',
    '/api/orders',
    '/api/auth/login',
    '/api/payments',
    '/api/analytics',
  ];
  const methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[] = ['GET', 'POST', 'PUT', 'DELETE'];
  
  for (let i = 0; i < 15; i++) {
    const isError = Math.random() < 0.15;
    const statusCode = isError ? [400, 401, 404, 500, 503][Math.floor(Math.random() * 5)] : 200;
    
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(Date.now() - i * 30000 - Math.random() * 10000),
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      statusCode,
      responseTime: isError ? Math.floor(Math.random() * 500 + 800) : Math.floor(Math.random() * 300 + 50),
      isError,
    });
  }
  
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const mockApiLogs: ApiLog[] = generateTimestamps();

export const mockLatencyData: LatencyDataPoint[] = [
  { time: '00:00', latency: 145, threshold: 500 },
  { time: '02:00', latency: 132, threshold: 500 },
  { time: '04:00', latency: 178, threshold: 500 },
  { time: '06:00', latency: 234, threshold: 500 },
  { time: '08:00', latency: 456, threshold: 500 },
  { time: '10:00', latency: 623, threshold: 500 },
  { time: '12:00', latency: 512, threshold: 500 },
  { time: '14:00', latency: 389, threshold: 500 },
  { time: '16:00', latency: 445, threshold: 500 },
  { time: '18:00', latency: 567, threshold: 500 },
  { time: '20:00', latency: 423, threshold: 500 },
  { time: '22:00', latency: 234, threshold: 500 },
];
