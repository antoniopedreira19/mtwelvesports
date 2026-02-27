export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          avatar_url: string | null
          closed_at: string | null
          created_at: string
          deal_value: number | null
          email: string | null
          id: string
          lost_reason: string | null
          meeting_date: string | null
          meeting_responsible: string | null
          name: string
          nationality: string | null
          next_step_notes: string | null
          notes: string | null
          payer_email: string | null
          payer_name: string | null
          payer_phone: string | null
          payer_relationship: string | null
          payment_method: string | null
          phone: string | null
          school: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          updated_at: string
          value: number | null
        }
        Insert: {
          avatar_url?: string | null
          closed_at?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          lost_reason?: string | null
          meeting_date?: string | null
          meeting_responsible?: string | null
          name: string
          nationality?: string | null
          next_step_notes?: string | null
          notes?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          payment_method?: string | null
          phone?: string | null
          school?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          avatar_url?: string | null
          closed_at?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          lost_reason?: string | null
          meeting_date?: string | null
          meeting_responsible?: string | null
          name?: string
          nationality?: string | null
          next_step_notes?: string | null
          notes?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          payment_method?: string | null
          phone?: string | null
          school?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          contract_id: string
          created_at: string
          employee_name: string
          id: string
          installment_id: string | null
          percentage: number
          status: Database["public"]["Enums"]["transaction_status"]
          value: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          employee_name: string
          id?: string
          installment_id?: string | null
          percentage: number
          status?: Database["public"]["Enums"]["transaction_status"]
          value: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          employee_name?: string
          id?: string
          installment_id?: string | null
          percentage?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string
          due_day: number | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["contract_status"]
          total_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_day?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          total_value: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_day?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          paid_at: string | null
          recurrence_period: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          paid_at?: string | null
          recurrence_period?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          paid_at?: string | null
          recurrence_period?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      installments: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          payment_date: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_fee: number | null
          value: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          payment_date: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_fee?: number | null
          value: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          payment_date?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_fee?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      financial_overview: {
        Row: {
          amount: number | null
          contract_id: string | null
          created_at: string | null
          date: string | null
          direction: string | null
          id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          title: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      contract_status: "draft" | "active" | "completed" | "cancelled"
      expense_category: "fixo" | "variavel" | "extra" | "imposto" | "comissao"
      pipeline_stage:
        | "radar"
        | "next_step"
        | "contato"
        | "negociacao"
        | "fechado"
        | "perdido"
      transaction_status: "pending" | "paid" | "overdue" | "cancelled"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      contract_status: ["draft", "active", "completed", "cancelled"],
      expense_category: ["fixo", "variavel", "extra", "imposto", "comissao"],
      pipeline_stage: [
        "radar",
        "next_step",
        "contato",
        "negociacao",
        "fechado",
        "perdido",
      ],
      transaction_status: ["pending", "paid", "overdue", "cancelled"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
