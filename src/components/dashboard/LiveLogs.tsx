import { Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ApiLog } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface LiveLogsProps {
  logs: ApiLog[];
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const methodColors: Record<string, string> = {
  GET: 'text-primary',
  POST: 'text-success',
  PUT: 'text-warning',
  DELETE: 'text-destructive',
  PATCH: 'text-accent',
};

export const LiveLogs = ({ logs }: LiveLogsProps) => {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Live API Logs</CardTitle>
            <p className="text-sm text-muted-foreground">
              Real-time request monitoring
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1">
            <Circle className="h-2 w-2 animate-pulse fill-success text-success" />
            <span className="text-xs font-medium text-success">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-0.5 p-4 pt-0">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  log.isError
                    ? 'bg-destructive/5 hover:bg-destructive/10'
                    : 'hover:bg-muted/50'
                )}
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatTime(log.timestamp)}
                </span>
                <span
                  className={cn(
                    'w-14 shrink-0 text-xs font-semibold',
                    methodColors[log.method]
                  )}
                >
                  {log.method}
                </span>
                <span className="flex-1 truncate font-mono text-xs">
                  {log.endpoint}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded px-2 py-0.5 text-xs font-medium',
                    log.isError
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-success/10 text-success'
                  )}
                >
                  {log.statusCode}
                </span>
                <span
                  className={cn(
                    'w-16 shrink-0 text-right text-xs font-medium',
                    log.responseTime > 500 && 'text-destructive'
                  )}
                >
                  {log.responseTime}ms
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
