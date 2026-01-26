import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
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
  Filter,
  Search, // <--- ADICIONADO AQUI
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

  // Controle de estado
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    receitas: false,
    despesas: false,
    comissoes: false,
  });

  // Estado do Modal de Detalhes
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<{
    title: string;
    month: string;
    records: FinancialRecord[];
  } | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  async function fetchFinancialData() {
    try {
      const { data, error } = await supabase.from("financial_overview").select("*").order("date", { ascending: true });

      if (error) throw error;
      setRecords(data as FinancialRecord[]);

      if (data && data.length > 0) {
        const years = Array.from(new Set(data.map((d: any) => d.date.substring(0, 4))))
          .sort()
          .reverse();
        if (!years.includes(new Date().getFullYear().toString()) && years.length > 0) {
          setSelectedYear(years[0]);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar financeiro:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // --- PROCESSAMENTO DA MATRIZ ---
  const { matrix, availableYears, displayMonths, totals } = useMemo(() => {
    const matrix: MatrixData = {
      receitas: { totalByMonth: {}, items: {} },
      despesas: { totalByMonth: {}, items: {} },
      comissoes: { totalByMonth: {}, items: {} },
    };

    const uniqueMonths = new Set<string>();
    const uniqueYears = new Set<string>();
    const grandTotals: Record<string, number> = {};

    records.forEach((record) => {
      const dateStr = record.date.includes("T") ? record.date : `${record.date}T12:00:00`;
      const dateObj = new Date(dateStr);

      const year = format(dateObj, "yyyy");
      uniqueYears.add(year);

      const monthKey = format(startOfMonth(dateObj), "yyyy-MM");
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
      catGroup.items[title][monthKey].records.push(record); // Guarda o registro bruto

      if (record.status) {
        catGroup.items[title][monthKey].status.push(record.status);
      }

      if (!grandTotals[monthKey]) grandTotals[monthKey] = 0;
      if (categoryKey === "receitas") grandTotals[monthKey] += val;
      else grandTotals[monthKey] -= val;
    });

    const allMonths = Array.from(uniqueMonths).sort();
    const sortedYears = Array.from(uniqueYears).sort().reverse();
    const displayMonths = allMonths.filter((m) => m.startsWith(selectedYear));

    return { matrix, availableYears: sortedYears, displayMonths, totals: grandTotals };
  }, [records, selectedYear]);

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

  const yearTotalReceitas = displayMonths.reduce((sum, m) => sum + (matrix.receitas.totalByMonth[m] || 0), 0);
  const yearTotalDespesas = displayMonths.reduce((sum, m) => sum + (matrix.despesas.totalByMonth[m] || 0), 0);
  const yearTotalComissoes = displayMonths.reduce((sum, m) => sum + (matrix.comissoes.totalByMonth[m] || 0), 0);
  const yearTotalLucro = yearTotalReceitas - (yearTotalDespesas + yearTotalComissoes);

  return (
    <div className="space-y-6">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto flex-1">
          {/* CARDS */}
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Receita ({selectedYear})</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(yearTotalReceitas)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500 opacity-50" />
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Despesas ({selectedYear})</p>
                <p className="text-lg font-bold text-red-500">
                  {formatCurrency(yearTotalDespesas + yearTotalComissoes)}
                </p>
              </div>
              <TrendingDown className="h-4 w-4 text-red-500 opacity-50" />
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Resultado ({selectedYear})</p>
                <p className={cn("text-lg font-bold", yearTotalLucro >= 0 ? "text-[#E8BD27]" : "text-red-500")}>
                  {formatCurrency(yearTotalLucro)}
                </p>
              </div>
              <DollarSign className="h-4 w-4 text-[#E8BD27] opacity-50" />
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-[180px] flex-shrink-0">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Selecione o Ano" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MATRIZ DRE */}
      <Card className="border-border/50 bg-card overflow-hidden shadow-md">
        <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg flex items-center gap-2">Matriz DRE - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[200px] font-bold text-primary pl-6 sticky left-0 bg-muted/30 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    Item
                  </TableHead>
                  {displayMonths.map((m) => (
                    <>
                      <TableHead key={m} className="text-right min-w-[110px] font-semibold">
                        {getMonthLabel(m)}
                      </TableHead>
                      <TableHead
                        key={`${m}-var`}
                        className="w-[50px] text-center text-[10px] text-muted-foreground p-1"
                      >
                        AH%
                      </TableHead>
                    </>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* RECEITAS */}
                <TableRow
                  className="cursor-pointer group hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRow("receitas")}
                >
                  <TableCell className="font-bold text-emerald-500 flex items-center gap-2 pl-4 sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/50 transition-colors">
                    {expandedRows.receitas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{" "}
                    Receitas
                  </TableCell>
                  {displayMonths.map((m) => (
                    <>
                      <TableCell key={m} className="text-right font-bold text-emerald-500/80">
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
                {expandedRows.receitas &&
                  getActiveItems(matrix.receitas.items).map((title) => (
                    <TableRow key={title} className="bg-muted/5 text-sm hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-10 text-muted-foreground flex items-center gap-2 sticky left-0 bg-muted/5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/10">
                        <div className="w-1 h-1 rounded-full bg-emerald-500/50" /> {title}
                      </TableCell>
                      {displayMonths.map((m) => (
                        <>
                          <TableCell key={m} className="text-right">
                            {matrix.receitas.items[title][m] ? (
                              <div className="flex items-center justify-end gap-2">
                                <span>{formatCurrency(matrix.receitas.items[title][m].amount)}</span>
                                <StatusIcon statuses={matrix.receitas.items[title][m].status} />
                              </div>
                            ) : (
                              <span className="text-muted-foreground/20">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-l border-dashed border-border/30 bg-muted/5"></TableCell>
                        </>
                      ))}
                    </TableRow>
                  ))}

                {/* COMISSÕES */}
                <TableRow
                  className="cursor-pointer group hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRow("comissoes")}
                >
                  <TableCell className="font-bold text-muted-foreground flex items-center gap-2 pl-4 sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/50 transition-colors">
                    {expandedRows.comissoes ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}{" "}
                    (-) Comissões
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
                    <TableRow key={title} className="bg-muted/5 text-sm hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-10 text-muted-foreground flex items-center gap-2 sticky left-0 bg-muted/5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/10">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50" /> {title}
                      </TableCell>
                      {displayMonths.map((m) => {
                        const cellData = matrix.comissoes.items[title][m];
                        // Sem traços, apenas cursor pointer e hover suave
                        const clickableClass =
                          cellData && cellData.amount > 0
                            ? "cursor-pointer hover:bg-muted/20 hover:text-primary transition-colors"
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
                            <TableCell className="border-l border-dashed border-border/30 bg-muted/5"></TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  ))}

                {/* DESPESAS */}
                <TableRow
                  className="cursor-pointer group hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRow("despesas")}
                >
                  <TableCell className="font-bold text-red-400 flex items-center gap-2 pl-4 sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/50 transition-colors">
                    {expandedRows.despesas ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{" "}
                    (-) Despesas
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
                    <TableRow key={title} className="bg-muted/5 text-sm hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-10 text-muted-foreground flex items-center gap-2 sticky left-0 bg-muted/5 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/10">
                        <div className="w-1 h-1 rounded-full bg-red-400/50" /> {title}
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
                          <TableCell className="border-l border-dashed border-border/30 bg-muted/5"></TableCell>
                        </>
                      ))}
                    </TableRow>
                  ))}

                {/* RESULTADO */}
                <TableRow className="bg-muted/10 border-t-2 border-border/50">
                  <TableCell className="font-bold text-[#E8BD27] pl-4 sticky left-0 bg-muted/10 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    (=) RESULTADO
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
        </CardContent>
      </Card>

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

      // Extrai os IDs reais das comissões (remove prefixos se houver)
      const ids = data.map((r) => (r.id.includes("_") ? r.id.split("_")[0] : r.id));

      try {
        // Busca os dados completos na tabela de comissões, fazendo join com parcelas e clientes
        const { data: commissions, error } = await supabase
          .from("commissions")
          .select(
            `
            id,
            value,
            percentage,
            status,
            installments (
              value,
              due_date
            ),
            contracts (
              clients (name)
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
      <DialogContent className="max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
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
          <div className="rounded-md border border-border/50 overflow-hidden">
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
                      {item.installments?.due_date && (
                        <span className="block text-xs text-muted-foreground">
                          Venc: {format(new Date(item.installments.due_date), "dd/MM")}
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
