import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, subMonths, isAfter, isBefore, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MonthRangeFilter } from "./MonthRangeFilter";

// --- TIPOS ---
interface FinancialRecord {
  id: string;
  title: string;
  type: string;
  direction: "entrada" | "saida";
  amount: number;
  date: string;
  status: string | null;
  contract_id: string | null;
}

type MatrixData = {
  [category: string]: {
    totalByMonth: Record<string, number>;
    items: Record<
      string,
      {
        [month: string]: {
          amount: number;
          status: string[];
          records: FinancialRecord[]; // Armazena os registros para o modal
        };
      }
    >;
  };
};

// --- COMPONENTE PRINCIPAL ---
export function FinancialSummary() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Controle de estado - Intervalo de meses
  const [startMonth, setStartMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1); // Janeiro do ano atual
  });
  const [endMonth, setEndMonth] = useState<Date>(() => {
    return startOfMonth(new Date()); // Mês atual
  });

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    receitas: false,
    despesas: false,
    comissoes: false,
  });

  // Estado do Modal de Detalhes (comissões)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<{
    title: string;
    month: string;
    records: FinancialRecord[];
  } | null>(null);

  // Estado do Modal de Receitas por cliente
  const [receitasModalOpen, setReceitasModalOpen] = useState(false);
  const [receitasModalMonth, setReceitasModalMonth] = useState<string | null>(null);
  const [receitasFilterPaid, setReceitasFilterPaid] = useState(false);

  // Datas mínimas e máximas baseadas nos dados
  const [minDate, setMinDate] = useState<Date | undefined>();
  const [maxDate, setMaxDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  async function fetchFinancialData() {
    try {
      const { data, error } = await supabase.from("financial_overview").select("*").order("date", { ascending: true });

      if (error) throw error;
      setRecords(data as FinancialRecord[]);

      if (data && data.length > 0) {
        // Define min/max dates based on data
        const dates = data.map((d: any) => new Date(d.date.includes("T") ? d.date : `${d.date}T12:00:00`));
        const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
        setMinDate(startOfMonth(sortedDates[0]));
        setMaxDate(startOfMonth(sortedDates[sortedDates.length - 1]));
      }
    } catch (error) {
      console.error("Erro ao buscar financeiro:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRangeChange = (start: Date, end: Date) => {
    setStartMonth(start);
    setEndMonth(end);
  };

  // Gerar label do período
  const getPeriodLabel = () => {
    const startLabel = format(startMonth, "MMM/yy", { locale: ptBR });
    const endLabel = format(endMonth, "MMM/yy", { locale: ptBR });
    return `${startLabel.charAt(0).toUpperCase() + startLabel.slice(1)} - ${endLabel.charAt(0).toUpperCase() + endLabel.slice(1)}`;
  };

  // --- PROCESSAMENTO DA MATRIZ ---
  const { matrix, displayMonths, totals } = useMemo(() => {
    const matrix: MatrixData = {
      receitas: { totalByMonth: {}, items: {} },
      despesas: { totalByMonth: {}, items: {} },
      comissoes: { totalByMonth: {}, items: {} },
    };

    const uniqueMonths = new Set<string>();
    const grandTotals: Record<string, number> = {};

    records.forEach((record) => {
      const dateStr = record.date.includes("T") ? record.date : `${record.date}T12:00:00`;
      const dateObj = new Date(dateStr);
      const recordMonth = startOfMonth(dateObj);

      // Filtra pelo intervalo de meses selecionado
      if (isBefore(recordMonth, startMonth) || isAfter(recordMonth, endMonth)) {
        return;
      }

      const monthKey = format(recordMonth, "yyyy-MM");
      uniqueMonths.add(monthKey);

      let categoryKey = "despesas";
      if (record.direction === "entrada") categoryKey = "receitas";
      else if (record.type === "comissao") categoryKey = "comissoes";

      const catGroup = matrix[categoryKey];
      if (!catGroup.totalByMonth[monthKey]) catGroup.totalByMonth[monthKey] = 0;

      const title = record.title || "Sem descrição";
      if (!catGroup.items[title]) catGroup.items[title] = {};
      if (!catGroup.items[title][monthKey]) {
        catGroup.items[title][monthKey] = { amount: 0, status: [], records: [] };
      }

      const val = Number(record.amount);
      catGroup.totalByMonth[monthKey] += val;
      catGroup.items[title][monthKey].amount += val;
      catGroup.items[title][monthKey].records.push(record);

      if (record.status) {
        catGroup.items[title][monthKey].status.push(record.status);
      }

      if (!grandTotals[monthKey]) grandTotals[monthKey] = 0;
      if (categoryKey === "receitas") grandTotals[monthKey] += val;
      else grandTotals[monthKey] -= val;
    });

    const displayMonths = Array.from(uniqueMonths).sort();

    return { matrix, displayMonths, totals: grandTotals };
  }, [records, startMonth, endMonth]);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCellClick = (category: string, title: string, month: string, cellData: any) => {
    if (category === "comissoes" && cellData && cellData.amount > 0) {
      setSelectedCellData({
        title, // ex: "Comissão: João"
        month, // ex: "2024-01"
        records: cellData.records,
      });
      setDetailModalOpen(true);
    }
  };

  // --- HELPERS ---
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = format(date, "MMM", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const getPrevMonthKey = (currentMonthKey: string) => {
    const [year, month] = currentMonthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const prevDate = subMonths(date, 1);
    return format(prevDate, "yyyy-MM");
  };

  const calculateVariation = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getActiveItems = (items: Record<string, any>) => {
    return Object.keys(items).filter((title) => {
      return displayMonths.some((m) => {
        const cell = items[title][m];
        return cell && Math.abs(cell.amount) > 0.001;
      });
    });
  };

  // --- SUB-COMPONENTES ---
  const VariationCell = ({
    current,
    monthKey,
    dataSource,
    type,
  }: {
    current: number;
    monthKey: string;
    dataSource: Record<string, number> | undefined;
    type: "good_is_up" | "good_is_down";
  }) => {
    const prevMonthKey = getPrevMonthKey(monthKey);
    const previous = dataSource ? dataSource[prevMonthKey] || 0 : 0;

    if (!previous)
      return <TableCell className="w-[50px] p-1 text-center text-[10px] text-muted-foreground">-</TableCell>;
    const variation = calculateVariation(current, previous);
    if (variation === 0)
      return (
        <TableCell className="w-[50px] p-1 text-center text-[10px] text-muted-foreground">
          <Minus className="w-3 h-3 mx-auto" />
        </TableCell>
      );

    const colorClass =
      type === "good_is_up"
        ? variation > 0
          ? "text-emerald-500 font-bold"
          : "text-red-400 font-bold"
        : variation > 0
          ? "text-red-400 font-bold"
          : "text-emerald-500 font-bold";

    return (
      <TableCell className="w-[50px] p-1 text-center border-l border-dashed border-border/30 bg-muted/5">
        <div className={cn("text-[10px] flex items-center justify-center gap-0.5", colorClass)}>
          {variation > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(variation).toFixed(0)}%
        </div>
      </TableCell>
    );
  };

  const StatusIcon = ({ statuses }: { statuses: string[] }) => {
    if (!statuses || statuses.length === 0) return null;
    const allPaid = statuses.every((s) => s === "paid");
    const hasPending = statuses.some((s) => s === "pending");
    if (allPaid) return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
    if (hasPending) return <Clock className="h-3 w-3 text-yellow-500" />;
    return <AlertCircle className="h-3 w-3 text-red-400" />;
  };

  // Cálculo Mês Atual e Mês Anterior — usa TODOS os records (não filtrados)
  // para que a variação funcione mesmo filtrando um único mês
  const allMonthTotals = useMemo(() => {
    const tots: Record<string, { receitas: number; despesas: number; comissoes: number }> = {};
    records.forEach((record) => {
      const dateStr = record.date.includes("T") ? record.date : `${record.date}T12:00:00`;
      const dateObj = new Date(dateStr);
      const monthKey = format(startOfMonth(dateObj), "yyyy-MM");
      if (!tots[monthKey]) tots[monthKey] = { receitas: 0, despesas: 0, comissoes: 0 };
      if (record.direction === "entrada") tots[monthKey].receitas += Number(record.amount);
      else if (record.type === "comissao") tots[monthKey].comissoes += Number(record.amount);
      else tots[monthKey].despesas += Number(record.amount);
    });
    return tots;
  }, [records]);

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (records.length === 0)
    return (
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 opacity-50">
          <DollarSign className="h-10 w-10 mb-2" />
          <p>Sem dados financeiros.</p>
        </CardContent>
      </Card>
    );

  const periodTotalReceitas = displayMonths.reduce((sum, m) => sum + (matrix.receitas.totalByMonth[m] || 0), 0);
  const periodTotalDespesas = displayMonths.reduce((sum, m) => sum + (matrix.despesas.totalByMonth[m] || 0), 0);
  const periodTotalComissoes = displayMonths.reduce((sum, m) => sum + (matrix.comissoes.totalByMonth[m] || 0), 0);
  const periodTotalLucro = periodTotalReceitas - (periodTotalDespesas + periodTotalComissoes);

  const currentMonthKey = format(startOfMonth(new Date()), "yyyy-MM");
  const prevMonthKey = getPrevMonthKey(currentMonthKey);

  const currentMonthReceitas = allMonthTotals[currentMonthKey]?.receitas || 0;
  const prevMonthReceitas = allMonthTotals[prevMonthKey]?.receitas || 0;
  const receitasVariation = calculateVariation(currentMonthReceitas, prevMonthReceitas);

  const currentMonthDespesas =
    (allMonthTotals[currentMonthKey]?.despesas || 0) + (allMonthTotals[currentMonthKey]?.comissoes || 0);
  const prevMonthDespesas =
    (allMonthTotals[prevMonthKey]?.despesas || 0) + (allMonthTotals[prevMonthKey]?.comissoes || 0);
  const despesasVariation = calculateVariation(currentMonthDespesas, prevMonthDespesas);

  const currentMonthResultado = currentMonthReceitas - currentMonthDespesas;
  const prevMonthResultado = prevMonthReceitas - prevMonthDespesas;
  const resultadoVariation = calculateVariation(currentMonthResultado, prevMonthResultado);

  // Calcular margem
  const margem = periodTotalReceitas > 0 ? (periodTotalLucro / periodTotalReceitas) * 100 : 0;
  const currentMonthMargem = currentMonthReceitas > 0 ? (currentMonthResultado / currentMonthReceitas) * 100 : 0;
  const prevMonthMargem = prevMonthReceitas > 0 ? (prevMonthResultado / prevMonthReceitas) * 100 : 0;
  const margemVariation = prevMonthMargem !== 0 ? currentMonthMargem - prevMonthMargem : 0;

  return (
    <div className="space-y-8">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          {/* CARD RECEITA */}
          <Card className="bg-card border-l-2 border-l-emerald-500 border-border/50 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Receita</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(periodTotalReceitas)}</p>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Mês Atual</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(currentMonthReceitas)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Var. Mês Anterior</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      receitasVariation >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {receitasVariation >= 0 ? "+" : ""}
                    {receitasVariation.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD DESPESA */}
          <Card className="bg-card border-l-2 border-l-red-500 border-border/50 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Despesa</p>
              <p className="text-lg font-bold text-foreground">
                -{formatCurrency(periodTotalDespesas + periodTotalComissoes)}
              </p>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Mês Atual</p>
                  <p className="text-sm font-semibold text-foreground">-{formatCurrency(currentMonthDespesas)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Variação Mês Anterior</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      despesasVariation <= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {despesasVariation >= 0 ? "+" : ""}
                    {despesasVariation.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD RESULTADO */}
          <Card className="bg-card border-l-2 border-l-primary border-border/50 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Resultado</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(periodTotalLucro)}</p>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Mês Atual</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(currentMonthResultado)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Variação Mês Anterior</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      resultadoVariation >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {resultadoVariation >= 0 ? "+" : ""}
                    {resultadoVariation.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD MARGEM */}
          <Card className="bg-card border-l-2 border-l-blue-500 border-border/50 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Margem</p>
              <p className="text-lg font-bold text-foreground">{margem.toFixed(2)}%</p>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border/30">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Mês Atual</p>
                  <p className="text-sm font-semibold text-foreground">{currentMonthMargem.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Variação Mês Anterior</p>
                  <p
                    className={cn("text-sm font-semibold", margemVariation >= 0 ? "text-emerald-500" : "text-red-500")}
                  >
                    {margemVariation >= 0 ? "+" : ""}
                    {margemVariation.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MATRIZ DRE - Premium Container */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-border/30 shadow-lg bg-card">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500" />
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-5 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Matriz DRE</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{getPeriodLabel()}</p>
            </div>
          </div>
          <MonthRangeFilter
            startMonth={startMonth}
            endMonth={endMonth}
            onRangeChange={handleRangeChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
        
        {/* Table content */}
        <div className="p-0">
          <div className="overflow-x-auto">
            <Table className="relative w-max min-w-0 table-auto">
              <TableHeader className="sticky top-0 z-30">
                <TableRow className="bg-table-header">
                  <TableHead className="w-[220px] min-w-[220px] max-w-[220px] font-bold text-primary pl-6 sticky left-0 bg-table-header z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                    Item
                  </TableHead>
                  {displayMonths.map((m) => (
                    <>
                      <TableHead key={m} className="text-right w-[130px] min-w-[130px] font-semibold bg-table-header">
                        {getMonthLabel(m)}
                      </TableHead>
                      <TableHead
                        key={`${m}-var`}
                        className="w-[50px] min-w-[50px] text-center text-[10px] text-muted-foreground p-1 bg-table-header"
                      >
                        AH%
                      </TableHead>
                    </>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* RECEITAS */}
                <TableRow className="group transition-colors hover:bg-table-row-alt">
                  <TableCell className="w-[220px] min-w-[220px] max-w-[220px] font-bold text-emerald-500 pl-4 sticky left-0 bg-table-row z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:bg-table-row-alt transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      Receitas
                    </div>
                  </TableCell>
                  {displayMonths.map((m) => (
                    <>
                      <TableCell
                        key={m}
                        className="text-right font-bold text-emerald-500/80 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                        onClick={() => {
                          setReceitasModalMonth(m);
                          setReceitasFilterPaid(false);
                          setReceitasModalOpen(true);
                        }}
                      >
                        {formatCurrency(matrix.receitas.totalByMonth[m] || 0)}
                      </TableCell>
                      <VariationCell
                        current={matrix.receitas.totalByMonth[m] || 0}
                        monthKey={m}
                        dataSource={matrix.receitas.totalByMonth}
                        type="good_is_up"
                      />
                    </>
                  ))}
                </TableRow>

                {/* COMISSÕES */}
                <TableRow
                  className="cursor-pointer group transition-colors hover:bg-table-row-alt"
                  onClick={() => toggleRow("comissoes")}
                >
                  <TableCell className="w-[220px] min-w-[220px] max-w-[220px] font-bold text-muted-foreground pl-4 sticky left-0 bg-table-row z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:bg-table-row-alt transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      {expandedRows.comissoes ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      (-) Comissões
                    </div>
                  </TableCell>
                  {displayMonths.map((m) => (
                    <>
                      <TableCell key={m} className="text-right font-bold text-muted-foreground">
                        {formatCurrency(matrix.comissoes.totalByMonth[m] || 0)}
                      </TableCell>
                      <VariationCell
                        current={matrix.comissoes.totalByMonth[m] || 0}
                        monthKey={m}
                        dataSource={matrix.comissoes.totalByMonth}
                        type="good_is_down"
                      />
                    </>
                  ))}
                </TableRow>
                {expandedRows.comissoes &&
                  getActiveItems(matrix.comissoes.items).map((title) => (
                    <TableRow key={title} className="bg-table-row-alt text-sm hover:bg-secondary transition-colors">
                      <TableCell className="w-[220px] min-w-[220px] max-w-[220px] pl-10 text-muted-foreground sticky left-0 bg-table-row-alt z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] hover:bg-secondary">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" /> {title}
                        </div>
                      </TableCell>
                      {displayMonths.map((m) => {
                        const cellData = matrix.comissoes.items[title][m];
                        const clickableClass =
                          cellData && cellData.amount > 0
                            ? "cursor-pointer hover:bg-secondary hover:text-primary transition-colors"
                            : "";

                        return (
                          <>
                            <TableCell
                              key={m}
                              className={cn("text-right", clickableClass)}
                              onClick={() => handleCellClick("comissoes", title, m, cellData)}
                            >
                              {cellData ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span>{formatCurrency(cellData.amount)}</span>
                                  <StatusIcon statuses={cellData.status} />
                                </div>
                              ) : (
                                <span className="text-muted-foreground/20">-</span>
                              )}
                            </TableCell>
                            <TableCell className="border-l border-dashed border-border/30"></TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  ))}

                {/* DESPESAS */}
                <TableRow
                  className="cursor-pointer group transition-colors hover:bg-table-row-alt"
                  onClick={() => toggleRow("despesas")}
                >
                  <TableCell className="w-[220px] min-w-[220px] max-w-[220px] font-bold text-red-400 pl-4 sticky left-0 bg-table-row z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] group-hover:bg-table-row-alt transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      {expandedRows.despesas ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      (-) Despesas
                    </div>
                  </TableCell>
                  {displayMonths.map((m) => (
                    <>
                      <TableCell key={m} className="text-right font-bold text-red-400/80">
                        {formatCurrency(matrix.despesas.totalByMonth[m] || 0)}
                      </TableCell>
                      <VariationCell
                        current={matrix.despesas.totalByMonth[m] || 0}
                        monthKey={m}
                        dataSource={matrix.despesas.totalByMonth}
                        type="good_is_down"
                      />
                    </>
                  ))}
                </TableRow>
                {expandedRows.despesas &&
                  getActiveItems(matrix.despesas.items).map((title) => (
                    <TableRow key={title} className="bg-table-row-alt text-sm hover:bg-secondary transition-colors">
                      <TableCell className="w-[220px] min-w-[220px] max-w-[220px] pl-10 text-muted-foreground sticky left-0 bg-table-row-alt z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] hover:bg-secondary">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-1 h-1 rounded-full bg-red-400/50 shrink-0" /> {title}
                        </div>
                      </TableCell>
                      {displayMonths.map((m) => (
                        <>
                          <TableCell key={m} className="text-right">
                            {matrix.despesas.items[title][m] ? (
                              <div className="flex items-center justify-end gap-2">
                                <span>{formatCurrency(matrix.despesas.items[title][m].amount)}</span>
                                <StatusIcon statuses={matrix.despesas.items[title][m].status} />
                              </div>
                            ) : (
                              <span className="text-muted-foreground/20">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-l border-dashed border-border/30"></TableCell>
                        </>
                      ))}
                    </TableRow>
                  ))}

                {/* RESULTADO */}
                <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t-2 border-primary/30">
                  <TableCell className="w-[220px] min-w-[220px] max-w-[220px] font-bold text-primary pl-4 sticky left-0 bg-table-row-result z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                    <span className="gold-text text-base">(=) RESULTADO</span>
                  </TableCell>
                  {displayMonths.map((m) => (
                    <>
                      <TableCell
                        key={m}
                        className={cn(
                          "text-right font-bold",
                          (totals[m] || 0) >= 0 ? "text-[#E8BD27]" : "text-red-500",
                        )}
                      >
                        {formatCurrency(totals[m] || 0)}
                      </TableCell>
                      <VariationCell current={totals[m] || 0} monthKey={m} dataSource={totals} type="good_is_up" />
                    </>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* MODAL DE RECEITAS POR CLIENTE */}
      {receitasModalOpen && receitasModalMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setReceitasModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" />
                Receitas — {getMonthLabel(receitasModalMonth)}
              </h3>
              <button
                onClick={() => setReceitasModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            {/* Filter toggle */}
            <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
              <button
                onClick={() => setReceitasFilterPaid(!receitasFilterPaid)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  receitasFilterPaid
                    ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apenas pagos
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {(() => {
                const items = matrix.receitas.items;
                let activeItems = getActiveItems(items).filter(
                  (title) => items[title][receitasModalMonth] && items[title][receitasModalMonth].amount > 0
                );
                if (receitasFilterPaid) {
                  activeItems = activeItems.filter((title) => {
                    const cell = items[title][receitasModalMonth];
                    return cell && cell.status.length > 0 && cell.status.every((s) => s === "paid");
                  });
                }
                const filteredTotal = activeItems.reduce((sum, title) => {
                  const cell = items[title][receitasModalMonth];
                  return sum + (cell?.amount || 0);
                }, 0);
                if (activeItems.length === 0) {
                  return (
                    <>
                      <div className="p-8 text-center text-muted-foreground">
                        {receitasFilterPaid ? "Nenhuma receita paga neste mês." : "Nenhuma receita neste mês."}
                      </div>
                      <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/30">
                        <span className="text-sm text-muted-foreground font-medium">Total</span>
                        <span className="text-base font-bold text-emerald-500">
                          {formatCurrency(0)}
                        </span>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    {activeItems.map((title, idx) => {
                      const cell = items[title][receitasModalMonth];
                      return (
                        <div
                          key={title}
                          className={cn(
                            "flex items-center justify-between px-5 py-3.5",
                            idx < activeItems.length - 1 && "border-b border-border/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                            <span className="text-sm font-medium">{title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-emerald-500">
                              {formatCurrency(cell.amount)}
                            </span>
                            <StatusIcon statuses={cell.status} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="p-4 border-t border-border/50 flex justify-between items-center bg-muted/30">
                      <span className="text-sm text-muted-foreground font-medium">Total{receitasFilterPaid ? " (pagos)" : ""}</span>
                      <span className="text-base font-bold text-emerald-500">
                        {formatCurrency(filteredTotal)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DA COMISSÃO */}
      {detailModalOpen && selectedCellData && (
        <CommissionDetailDialog
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          data={selectedCellData.records}
          employeeName={selectedCellData.title.replace("Comissão: ", "")}
          monthLabel={getMonthLabel(selectedCellData.month)}
        />
      )}
    </div>
  );
}

// --- MODAL DE DETALHES ---
function CommissionDetailDialog({
  open,
  onOpenChange,
  data,
  employeeName,
  monthLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: FinancialRecord[];
  employeeName: string;
  monthLabel: string;
}) {
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      if (!data || data.length === 0) return;

      const ids = data.map((r) => r.id);

      try {
        // Busca comissões pelo employee_name e mês, com join nas parcelas e clientes
        const { data: commissions, error } = await supabase
          .from("commissions")
          .select(
            `
            id,
            value,
            percentage,
            status,
            installment_id,
            installments!commissions_installment_id_fkey (
              value,
              payment_date
            ),
            contracts!commissions_contract_id_fkey (
              clients!contracts_client_id_fkey (name)
            )
          `,
          )
          .in("id", ids);

        if (error) throw error;
        setDetails(commissions || []);
      } catch (err) {
        console.error("Erro ao buscar detalhes da comissão:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Detalhamento de Comissões
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Beneficiário: <span className="font-medium text-foreground">{employeeName}</span> | Mês:{" "}
            <span className="font-medium text-foreground">{monthLabel}</span>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border border-border/50 overflow-auto flex-1 min-h-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Fonte (Cliente)</TableHead>
                  <TableHead className="text-right">Valor da Parcela</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((item, i) => (
                  <TableRow key={item.id || i} className="hover:bg-muted/5">
                    <TableCell className="font-medium">
                      {item.contracts?.clients?.name || "Cliente N/A"}
                      {item.installments?.payment_date && (
                        <span className="block text-xs text-muted-foreground">
                          Venc: {format(new Date(item.installments.payment_date), "dd/MM")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        item.installments?.value || 0,
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-500">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.value || 0)}
                      <span className="block text-xs text-muted-foreground font-normal">({item.percentage}%)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.status === "paid" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                          Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-600 ring-1 ring-inset ring-yellow-500/20">
                          Pendente
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {details.length > 0 && (
                  <TableRow className="bg-muted/10 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        details.reduce((acc, curr) => acc + (curr.installments?.value || 0), 0),
                      )}
                    </TableCell>
                    <TableCell className="text-right text-emerald-500">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        details.reduce((acc, curr) => acc + (curr.value || 0), 0),
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
                {details.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum detalhe encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
