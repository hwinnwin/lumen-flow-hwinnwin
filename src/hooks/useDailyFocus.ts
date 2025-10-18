import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FocusTheme {
  title: string;
  description: string;
  priority_score: number;
  aligned_principles: string[];
}

export interface TopAction {
  priority: 'high' | 'medium' | 'low';
  title: string;
  why: string;
  impact: string;
  related_docs?: string[];
  related_sops?: string[];
  quick_action: string;
}

export interface ProjectHealth {
  project_id: string;
  project_name: string;
  status: 'on_track' | 'needs_attention' | 'at_risk' | 'blocked';
  health_score: number;
  next_milestone: string;
  blocking_issue: string | null;
  principle_alignment: number;
  ai_recommendation: string;
}

export interface Insight {
  type: 'pattern' | 'risk' | 'opportunity' | 'connection';
  title: string;
  description: string;
  action: string;
}

export interface DailyFocus {
  id: string;
  user_id: string;
  date: string;
  focus_theme: FocusTheme;
  top_actions: TopAction[];
  project_health: ProjectHealth[];
  insights: Insight[];
  generated_at: string;
  user_overrides?: any;
}

export function useDailyFocus() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['daily-focus', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_focus')
        .select('*')
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Transform the JSONB fields to proper types
      return {
        ...data,
        focus_theme: data.focus_theme as unknown as FocusTheme,
        top_actions: data.top_actions as unknown as TopAction[],
        project_health: data.project_health as unknown as ProjectHealth[],
        insights: data.insights as unknown as Insight[],
      } as DailyFocus;
    },
  });
}

export function useGenerateDailyFocus() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-daily-focus', {
        body: { date: today }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-focus'] });
      toast.success('Daily focus generated successfully!');
    },
    onError: (error: Error) => {
      console.error('Error generating daily focus:', error);
      toast.error('Failed to generate daily focus: ' + error.message);
    },
  });
}

export function useFocusActions() {
  return useQuery({
    queryKey: ['focus-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('focus_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('focus_actions')
        .update({ 
          completed_at: new Date().toISOString(),
          time_to_complete: 'now() - created_at'
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-actions'] });
      toast.success('Action completed! 🎉');
    },
    onError: (error: Error) => {
      toast.error('Failed to complete action: ' + error.message);
    },
  });
}

export function useDeferAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('focus_actions')
        .update({ deferred: true })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-actions'] });
      toast.success('Action deferred to tomorrow');
    },
    onError: (error: Error) => {
      toast.error('Failed to defer action: ' + error.message);
    },
  });
}