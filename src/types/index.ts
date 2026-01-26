// --- Enums & Tipos Básicos ---
export type PipelineStage = "radar" | "contato" | "negociacao" | "fechado" | "perdido";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled";
export type TransactionStatus = "pending" | "paid" | "overdue" | "cancelled";
export type TransactionType = "income" | "expense";

// --- Interfaces Principais ---

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  school: string | null;
  nationality: string | null;
  stage: PipelineStage;
  value: number | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sport?: string;
  status?: string;
}

export interface PipelineColumn {
  id: PipelineStage;
  title: string;
  clients: Client[];
}

export interface Contract {
  id: string;
  client_id: string;
  total_value: number;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transaction_fee_percentage?: number;
  clients?: Client;
}

export interface Installment {
  id: string;
  contract_id: string;
  value: number;
  due_date: string;
  status: TransactionStatus;
  transaction_fee: number; // Campo novo
  created_at?: string;
}

export interface Commission {
  id: string;
  contract_id: string;
  installment_id: string | null;
  employee_name: string;
  percentage: number;
  value: number;
  status: TransactionStatus; // Campo novo
  created_at?: string;
}

export interface Transaction {
  id: string;
  contract_id: string | null;
  type: TransactionType;
  description: string;
  value: number;
  due_date: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}
