import { supabase } from "@/integrations/supabase/client";
import { Installment, Commission } from "@/types";

interface CreateContractInput {
  clientId: string;
  totalValue: number;
  installments: (Omit<Installment, "id" | "contract_id"> & { transaction_fee?: number })[];
  commissions: Omit<Commission, "id" | "contract_id" | "value" | "installment_id" | "status">[];
}

export async function createContract({ clientId, totalValue, installments, commissions }: CreateContractInput) {
  // 1. Criar Contrato
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id: clientId,
      total_value: totalValue,
      status: "active",
    })
    .select()
    .single();

  if (contractError || !contract) throw contractError || new Error("Erro ao criar contrato");

  try {
    // 2. Inserir Parcelas
    if (installments.length > 0) {
      const installmentsData = installments.map((inst) => ({
        contract_id: contract.id,
        value: inst.value,
        due_date: inst.due_date,
        status: (inst.status || "pending") as "pending" | "paid" | "overdue" | "cancelled",
        transaction_fee: inst.transaction_fee || 0,
      }));

      const { error: installmentsError } = await supabase.from("installments").insert(installmentsData);

      if (installmentsError) throw installmentsError;
    }

    // 3. Buscar IDs das parcelas criadas (IMPORTANTE: trazer transaction_fee)
    const { data: createdInstallments, error: fetchInstError } = await supabase
      .from("installments")
      .select("id, value, transaction_fee")
      .eq("contract_id", contract.id);

    if (fetchInstError) throw fetchInstError;

    // 4. Inserir Comissões (CÁLCULO: Valor - Taxa)
    if (commissions.length > 0 && createdInstallments) {
      const commissionsData = commissions.flatMap((comm) =>
        createdInstallments.map((inst) => {
          // Lógica de Cálculo Líquido
          const grossValue = Number(inst.value);
          const fee = Number(inst.transaction_fee || 0);
          const netValue = Math.max(0, grossValue - fee); // Evita valor negativo

          return {
            contract_id: contract.id,
            installment_id: inst.id,
            employee_name: comm.employee_name,
            percentage: comm.percentage,
            value: (netValue * comm.percentage) / 100, // Aplica % sobre o Líquido
            status: "pending" as const,
          };
        }),
      );

      const { error: commissionsError } = await supabase.from("commissions").insert(commissionsData);

      if (commissionsError) throw commissionsError;
    }

    // 5. Atualizar Cliente
    await supabase.from("clients").update({ stage: "fechado" }).eq("id", clientId);

    return contract;
  } catch (error) {
    console.error("Erro no processo, revertendo...", error);
    if (contract) {
      await supabase.from("contracts").delete().eq("id", contract.id);
    }
    throw error;
  }
}

export async function deleteContract(contractId: string) {
  await supabase.from("commissions").delete().eq("contract_id", contractId);
  await supabase.from("installments").delete().eq("contract_id", contractId);
  const { error } = await supabase.from("contracts").delete().eq("id", contractId);
  if (error) throw error;
}

export async function updateInstallmentStatus(
  installmentId: string,
  status: "pending" | "paid" | "overdue" | "cancelled",
) {
  const { error } = await supabase.from("installments").update({ status }).eq("id", installmentId);
  if (error) throw error;
}

// Atualiza valor/taxa da parcela e recalcula comissões vinculadas
export async function updateInstallmentValue(installmentId: string, newValue: number, newFee?: number) {
  const updateData: any = { value: newValue };
  if (newFee !== undefined) updateData.transaction_fee = newFee;

  // 1. Atualiza a parcela
  const { error: instError } = await supabase.from("installments").update(updateData).eq("id", installmentId);
  if (instError) throw instError;

  // 2. Busca dados atualizados da parcela (para garantir que temos taxa e valor certos)
  const { data: installment } = await supabase
    .from("installments")
    .select("value, transaction_fee")
    .eq("id", installmentId)
    .single();
  if (!installment) return;

  const currentVal = Number(installment.value);
  const currentFee = Number(installment.transaction_fee || 0);
  const netValue = Math.max(0, currentVal - currentFee);

  // 3. Recalcula comissões vinculadas
  const { data: commissions, error: commError } = await supabase
    .from("commissions")
    .select("id, percentage")
    .eq("installment_id", installmentId);
  if (commError) throw commError;

  if (commissions && commissions.length > 0) {
    for (const comm of commissions) {
      const newCommValue = (netValue * comm.percentage) / 100;
      await supabase.from("commissions").update({ value: newCommValue }).eq("id", comm.id);
    }
  }
}

export async function checkAndCompleteContract(contractId: string) {
  const { data: installments, error } = await supabase
    .from("installments")
    .select("status")
    .eq("contract_id", contractId);
  if (error) throw error;
  const allPaid = installments?.every((i) => i.status === "paid");
  if (allPaid) {
    await supabase.from("contracts").update({ status: "completed" }).eq("id", contractId);
    return true;
  }
  return false;
}

export async function getContractDetails(contractId: string) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`*, clients (id, name, school, avatar_url)`)
    .eq("id", contractId)
    .single();

  if (contractError) throw contractError;
  if (!contract) throw new Error("Contrato não encontrado");

  const { data: installments, error: instError } = await supabase
    .from("installments")
    .select("*")
    .eq("contract_id", contractId)
    .order("due_date", { ascending: true });
  if (instError) throw instError;

  const { data: commissions, error: commError } = await supabase
    .from("commissions")
    .select("*")
    .eq("contract_id", contractId);
  if (commError) throw commError;

  return { contract, installments: installments || [], commissions: commissions || [] };
}
