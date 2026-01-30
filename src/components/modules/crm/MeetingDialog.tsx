import { useState } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { Client } from "@/types";

interface MeetingDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clientId: string, meetingDate: Date, responsible: string) => Promise<void>;
  onCancel: () => void;
}

export function MeetingDialog({
  client,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: MeetingDialogProps) {
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [responsible, setResponsible] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: employees = [] } = useEmployees();

  const handleConfirm = async () => {
    if (!client || !meetingDate || !responsible) return;
    
    setIsLoading(true);
    try {
      await onConfirm(client.id, meetingDate, responsible);
      onOpenChange(false);
      setMeetingDate(new Date());
      setResponsible("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setMeetingDate(new Date());
    setResponsible("");
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
          <DialogDescription>
            Cadastre os dados da reunião para {client.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Data da Reunião</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !meetingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={setMeetingDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label>Responsável</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.name}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!meetingDate || !responsible || isLoading}
            className="gold-gradient text-black font-bold"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
