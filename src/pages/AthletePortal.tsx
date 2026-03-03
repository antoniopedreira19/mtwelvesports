import { Construction } from "lucide-react";

export default function AthletePortal() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Portal do Atleta</h1>
      <p className="text-muted-foreground max-w-md">
        Esta área está em construção. Em breve você poderá acessar seus documentos,
        pagamentos e oportunidades por aqui.
      </p>
    </div>
  );
}
