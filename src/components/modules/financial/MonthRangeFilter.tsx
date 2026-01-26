import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, isBefore, isAfter, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MonthRangeFilterProps {
  startMonth: Date;
  endMonth: Date;
  onRangeChange: (start: Date, end: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function MonthRangeFilter({
  startMonth,
  endMonth,
  onRangeChange,
  minDate,
  maxDate,
}: MonthRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);

  // Meses do ano atual em exibição
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(viewYear, i, 1));
  }, [viewYear]);

  // Anos disponíveis para navegação
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const startYear = minDate ? minDate.getFullYear() : currentYear - 5;
    const endYear = maxDate ? maxDate.getFullYear() : currentYear + 2;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, [minDate, maxDate, currentYear]);

  const formatMonthShort = (date: Date) => {
    const label = format(date, "MMM", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatMonthYear = (date: Date) => {
    const label = format(date, "MMM/yy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const isMonthInRange = (month: Date) => {
    const start = tempStart || startMonth;
    const end = tempEnd || endMonth;
    return (
      (isSameMonth(month, start) || isAfter(month, start)) &&
      (isSameMonth(month, end) || isBefore(month, end))
    );
  };

  const isMonthStart = (month: Date) => {
    const start = tempStart || startMonth;
    return isSameMonth(month, start);
  };

  const isMonthEnd = (month: Date) => {
    const end = tempEnd || endMonth;
    return isSameMonth(month, end);
  };

  const isMonthDisabled = (month: Date) => {
    if (minDate && isBefore(month, startOfMonth(minDate))) return true;
    if (maxDate && isAfter(month, startOfMonth(maxDate))) return true;
    return false;
  };

  const handleMonthClick = (month: Date) => {
    if (isMonthDisabled(month)) return;

    if (selectionMode === "start") {
      setTempStart(month);
      setTempEnd(null);
      setSelectionMode("end");
    } else {
      // Se o mês selecionado for antes do início, inverte
      if (tempStart && isBefore(month, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(month);
      } else {
        setTempEnd(month);
      }
      setSelectionMode("start");
    }
  };

  const handleApply = () => {
    const start = tempStart || startMonth;
    const end = tempEnd || tempStart || endMonth;
    
    // Garante que start seja antes de end
    if (isBefore(end, start)) {
      onRangeChange(end, start);
    } else {
      onRangeChange(start, end);
    }
    
    setTempStart(null);
    setTempEnd(null);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    setSelectionMode("start");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempStart(null);
      setTempEnd(null);
      setSelectionMode("start");
      setViewYear(startMonth.getFullYear());
    }
  };

  // Presets rápidos
  const presets = [
    {
      label: "Último trimestre",
      getRange: () => {
        const now = new Date();
        return [addMonths(startOfMonth(now), -2), startOfMonth(now)] as [Date, Date];
      },
    },
    {
      label: "Últimos 6 meses",
      getRange: () => {
        const now = new Date();
        return [addMonths(startOfMonth(now), -5), startOfMonth(now)] as [Date, Date];
      },
    },
    {
      label: "Este ano",
      getRange: () => {
        const now = new Date();
        return [new Date(now.getFullYear(), 0, 1), startOfMonth(now)] as [Date, Date];
      },
    },
    {
      label: "Ano passado",
      getRange: () => {
        const lastYear = new Date().getFullYear() - 1;
        return [new Date(lastYear, 0, 1), new Date(lastYear, 11, 1)] as [Date, Date];
      },
    },
  ];

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const [start, end] = preset.getRange();
    onRangeChange(start, end);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-2 min-w-[220px]",
            isOpen && "ring-2 ring-primary/20"
          )}
        >
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="flex items-center gap-1">
            <span className="font-medium">{formatMonthYear(startMonth)}</span>
            <span className="text-muted-foreground">até</span>
            <span className="font-medium">{formatMonthYear(endMonth)}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
        <div className="flex">
          {/* Painel de Presets */}
          <div className="w-40 border-r border-border p-3 space-y-1 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Atalhos
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Seletor de Meses */}
          <div className="p-4 min-w-[280px]">
            {/* Header com navegação do ano */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewYear((y) => y - 1)}
                disabled={!years.includes(viewYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-lg">{viewYear}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewYear((y) => y + 1)}
                disabled={!years.includes(viewYear + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Indicador de seleção */}
            <div className="mb-3 text-center">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  selectionMode === "start"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {selectionMode === "start" ? "Selecione o mês inicial" : "Selecione o mês final"}
              </span>
            </div>

            {/* Grid de meses */}
            <div className="grid grid-cols-4 gap-1">
              {months.map((month) => {
                const disabled = isMonthDisabled(month);
                const inRange = isMonthInRange(month);
                const isStart = isMonthStart(month);
                const isEnd = isMonthEnd(month);
                const isEdge = isStart || isEnd;

                return (
                  <button
                    key={month.toISOString()}
                    onClick={() => handleMonthClick(month)}
                    disabled={disabled}
                    className={cn(
                      "relative h-10 text-sm font-medium rounded-md transition-all",
                      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50",
                      disabled && "opacity-30 cursor-not-allowed hover:bg-transparent",
                      inRange && !isEdge && "bg-primary/10",
                      isEdge && "bg-primary text-primary-foreground",
                      isStart && "rounded-r-none",
                      isEnd && "rounded-l-none",
                      isStart && isEnd && "rounded-md"
                    )}
                  >
                    {formatMonthShort(month)}
                  </button>
                );
              })}
            </div>

            {/* Seleção atual */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium">
                    {formatMonthYear(tempStart || startMonth)} - {formatMonthYear(tempEnd || tempStart || endMonth)}
                  </span>
                </div>
                {(tempStart || tempEnd) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleClear}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Botão Aplicar */}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleApply}
                size="sm"
                className="gold-gradient text-primary-foreground font-semibold"
              >
                Aplicar Filtro
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
