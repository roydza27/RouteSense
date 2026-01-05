import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
}

export const MetricCard = ({
  title,
  value,
  unit,
  trend,
  icon: Icon,
  variant = "default",
}: MetricCardProps) => {
  const isPositiveTrend = trend !== undefined && trend > 0;
  const trendIsGood = title.toLowerCase().includes("error") ? !isPositiveTrend : isPositiveTrend;

  // If value is 0 or empty, show placeholder instead of dummy
  const displayValue =
    value === 0 || value === "0" || value === "" || value === undefined || value === null
      ? "—"
      : value;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">{displayValue}</span>
              {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
            </div>

            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trendIsGood ? "text-success" : "text-destructive"
                )}
              >
                {isPositiveTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(trend)}% from last period</span>
              </div>
            )}
          </div>

          <div className={cn("rounded-xl p-2.5", `text-${variant}`)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
