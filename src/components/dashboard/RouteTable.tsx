import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Use your real interface already used in main file
interface RouteAnalytics {
  id: string;
  route: string;
  method: string;
  hits: number;
  avgTime: number;
  errorPercent: number;
  isSlow?: boolean;
}

interface RouteTableProps {
  routes: RouteAnalytics[];
}

export const RouteTable = ({ routes }: RouteTableProps) => {
  // ✅ Empty state - ensures nothing is rendered when no real data exists
  if (!routes || routes.length === 0) {
    return (
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
          No route analytics yet
        </CardContent>
      </Card>
    );
  }

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
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                      route.method === "GET"
                        ? "bg-primary/10 text-primary"
                        : route.method === "POST"
                        ? "bg-success/10 text-success"
                        : route.method === "PUT"
                        ? "bg-warning/10 text-warning"
                        : route.method === "DELETE"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/10 text-accent"
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
                    "text-right font-medium",
                    route.avgTime > 500 && "text-destructive"
                  )}
                >
                  {route.avgTime}ms
                </TableCell>

                <TableCell
                  className={cn(
                    "text-right font-medium",
                    route.errorPercent > 3 && "text-destructive"
                  )}
                >
                  {route.errorPercent.toFixed(2)}%
                </TableCell>

                <TableCell className="pr-6 text-right">
                  <Badge
                    variant={route.isSlow ? "destructive" : "default"}
                    className={cn(
                      "rounded-full text-xs font-medium",
                      !route.isSlow && "bg-success/10 text-success hover:bg-success/20"
                    )}
                  >
                    {route.isSlow ? "Slow" : "Normal"}
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
