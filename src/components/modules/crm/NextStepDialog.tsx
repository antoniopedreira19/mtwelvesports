import { useState } from "react";
import { Footprints, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Client } from "@/types";

interface NextStepDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clientId: string, notes: string) => Promise<void>;
  onCancel: () => void;
}

export function NextStepDialog({
  client,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: NextStepDialogProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!client || !notes.trim()) return;
    setIsLoading(true);
    try {
      await onConfirm(client.id, notes.trim());
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNotes("");
    onCancel();
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-purple-400" />
            Próximos Passos
          </DialogTitle>
          <DialogDescription>
            Registre os próximos passos estratégicos para <strong>{client.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Descreva os próximos passos..."
          className="min-h-[120px] resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!notes.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
