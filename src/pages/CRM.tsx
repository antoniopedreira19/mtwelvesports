import { useState } from "react";
import { Search, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PipelineBoard } from "@/components/modules/crm/PipelineBoard";
import { NewClientDialog } from "@/components/modules/crm/NewClientDialog";
import { ContractBuilder } from "@/components/modules/financial/ContractBuilder";
import { Client, Installment, Commission } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { createContract } from "@/services/contractService";
import { cn } from "@/lib/utils";

type InstallmentWithFee = Omit<Installment, "id" | "contract_id"> & { transaction_fee?: number };

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function CRM() {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Filtros (Apenas Busca e Mês)
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // Estados do Popover de Mês
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { toast } = useToast();

  const handleClientMoveToFechado = (client: Client) => {
    setSelectedClient(client);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (data: {
    totalValue: number;
    installments: InstallmentWithFee[];
    commissions: Omit<Commission, "id" | "contract_id" | "value" | "installment_id" | "status">[];
  }) => {
    if (!selectedClient) {
      toast({ title: "Erro", description: "Nenhum cliente selecionado.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      await createContract({
        clientId: selectedClient.id,
        totalValue: data.totalValue,
        installments: data.installments,
        commissions: data.commissions,
      });

      toast({ title: "Contrato Salvo!", description: `Contrato de ${selectedClient.name} cadastrado com sucesso.` });
      setIsContractModalOpen(false);
      setSelectedClient(undefined);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar o contrato.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const getDisplayMonth = () => {
    if (!monthFilter) return "Mês de entrada";
    const [year, month] = monthFilter.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const formatted = format(date, "MMMM yyyy", { locale: ptBR });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu pipeline de atletas</p>
        </div>
        <NewClientDialog onSuccess={handleClientCreated} />
      </div>

      {/* Barra de Filtros (Limpa) */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou clube..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background h-10"
          />
        </div>

        {/* CUSTOM MONTH PICKER UI/UX */}
        <div className="relative flex-1 md:max-w-[220px]">
          <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-border bg-background h-10 px-3",
                  !monthFilter && "text-muted-foreground",
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                <span className="flex-1 truncate">{getDisplayMonth()}</span>
                {monthFilter && (
                  <div
                    role="button"
                    tabIndex={0}
                    className="ml-2 p-0.5 rounded-full hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMonthFilter("");
                    }}
                  >
                    <X className="h-3.5 w-3.5 opacity-70 hover:opacity-100 text-red-400" />
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-card border-border shadow-xl rounded-xl" align="end">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(pickerYear - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-sm">{pickerYear}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear(pickerYear + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_PT.map((month, index) => {
                  const monthValue = `${pickerYear}-${String(index + 1).padStart(2, "0")}`;
                  const isSelected = monthFilter === monthValue;

                  return (
                    <Button
                      key={month}
                      variant={isSelected ? "default" : "ghost"}
                      className={cn(
                        "h-9 text-xs",
                        isSelected
                          ? "bg-[#E8BD27] text-primary-foreground hover:bg-[#E8BD27]/90 shadow-sm"
                          : "hover:bg-muted",
                      )}
                      onClick={() => {
                        setMonthFilter(monthValue);
                        setIsMonthPickerOpen(false);
                      }}
                    >
                      {month}
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Pipeline Board */}
      <PipelineBoard
        key={refreshTrigger}
        onClientMoveToFechado={handleClientMoveToFechado}
        searchTerm={searchTerm}
        monthFilter={monthFilter}
      />

      {/* Contract Modal */}
      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b border-border/50">
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="w-1 h-6 bg-[#E8BD27] rounded-full inline-block"></span>
              Novo Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <ContractBuilder
              client={selectedClient ? { id: selectedClient.id, name: selectedClient.name } : undefined}
              onSave={handleSaveContract}
              onCancel={() => {
                setIsContractModalOpen(false);
                setSelectedClient(undefined);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
