import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Client } from "@/types";

interface LostReasonDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clientId: string, reason: string) => Promise<void>;
  onCancel: () => void;
}

export function LostReasonDialog({
  client,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: LostReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!client || !reason.trim()) return;
    
    setIsLoading(true);
    try {
      await onConfirm(client.id, reason);
      onOpenChange(false);
      setReason("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setReason("");
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
          <DialogDescription>
            Informe o motivo pelo qual {client.name} foi perdido.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo da perda..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none bg-background"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            variant="destructive"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
