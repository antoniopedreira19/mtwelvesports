import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string; // Espera sempre uma string (ex: "R$ 1.000,00" ou "205")
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  trendLabel?: string;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string; // Adicionado para aceitar bordas coloridas
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel = "vs mês anterior",
  variant = "default",
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "group relative p-6 rounded-xl border transition-all duration-300",
        "bg-card hover:bg-card/80",
        "border-border/50 hover:border-border",
        "hover:shadow-lg hover:shadow-black/20",
        variant === "primary" && "border-primary/30 hover:border-primary/50 surface-glow",
        className,
      )}
    >
      {/* Accent line */}
      <div
        className={cn(
          "absolute top-0 left-6 right-6 h-px",
          variant === "primary" && "bg-gradient-to-r from-transparent via-primary to-transparent",
          variant === "success" && "bg-gradient-to-r from-transparent via-success to-transparent",
          variant === "warning" && "bg-gradient-to-r from-transparent via-warning to-transparent",
          variant === "default" && "bg-gradient-to-r from-transparent via-border to-transparent",
        )}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold tracking-tight", variant === "primary" && "gold-text")}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div
          className={cn(
            "p-2.5 rounded-lg transition-colors",
            variant === "primary" && "bg-primary/10 text-primary",
            variant === "success" && "bg-success/10 text-success",
            variant === "warning" && "bg-warning/10 text-warning",
            variant === "default" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
