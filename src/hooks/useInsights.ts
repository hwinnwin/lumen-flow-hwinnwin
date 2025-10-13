import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Insight {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Insight[];
    },
  });
}

export function useCreateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insight: Omit<Insight, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("insights")
        .insert({ ...insight, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast({
        title: "Insight created",
        description: "Your insight has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create insight.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Insight> & { id: string }) => {
      const { data, error } = await supabase
        .from("insights")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast({
        title: "Insight updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update insight.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast({
        title: "Insight deleted",
        description: "The insight has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete insight.",
        variant: "destructive",
      });
    },
  });
}
