import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Opportunity } from "./useOpportunities";

export function useAthleteOpportunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["athlete-opportunities", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Find client linked to this user
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!client) return [] as Opportunity[];

      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Opportunity[];
    },
  });
}
