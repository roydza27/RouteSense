import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RouteAnalytics } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface RouteTableProps {
  routes: RouteAnalytics[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-primary/10 text-primary',
  POST: 'bg-success/10 text-success',
  PUT: 'bg-warning/10 text-warning',
  DELETE: 'bg-destructive/10 text-destructive',
  PATCH: 'bg-accent/10 text-accent',
};

export const RouteTable = ({ routes }: RouteTableProps) => {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Route Analytics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Performance breakdown by endpoint
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Route</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead className="text-right">Avg Time</TableHead>
              <TableHead className="text-right">Error %</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id} className="group">
                <TableCell className="pl-6 font-mono text-sm">
                  {route.route}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold',
                      methodColors[route.method]
                    )}
                  >
                    {route.method}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {route.hits.toLocaleString()}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-medium',
                    route.avgTime > 500 && 'text-destructive'
                  )}
                >
                  {route.avgTime}ms
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-medium',
                    route.errorPercent > 3 && 'text-destructive'
                  )}
                >
                  {route.errorPercent}%
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Badge
                    variant={route.status === 'slow' ? 'destructive' : 'default'}
                    className={cn(
                      'rounded-full text-xs font-medium',
                      route.status === 'normal' &&
                        'bg-success/10 text-success hover:bg-success/20'
                    )}
                  >
                    {route.status === 'slow' ? 'Slow' : 'Normal'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
