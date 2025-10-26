import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  primary_principle_id?: string;
  created_at: string;
  updated_at: string;
};

export type ProjectGoal = {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
};

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProjectGoals(projectId?: string) {
  return useQuery({
    queryKey: ["project-goals", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_goals")
        .select("*")
        .eq("project_id", projectId)
        .order("target_date", { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as ProjectGoal[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (project: Omit<Project, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("projects")
        .insert([{ ...project, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Project created",
        description: "Your project has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (project: Partial<Project> & { id: string }) => {
      const { error } = await supabase
        .from("projects")
        .update(project)
        .eq("id", project.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Project updated",
        description: "Your project has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Project deleted",
        description: "Your project has been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateProjectGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goal: Omit<ProjectGoal, "id" | "created_at" | "updated_at" | "completed" | "completed_at">) => {
      const { data, error } = await supabase
        .from("project_goals")
        .insert([goal])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-goals", variables.project_id] });
      toast({
        title: "Goal created",
        description: "Project goal has been created successfully",
      });
    },
  });
}

export function useUpdateProjectGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goal: Partial<ProjectGoal> & { id: string; project_id: string }) => {
      const { error } = await supabase
        .from("project_goals")
        .update(goal)
        .eq("id", goal.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-goals", variables.project_id] });
      toast({
        title: "Goal updated",
        description: "Project goal has been updated successfully",
      });
    },
  });
}

export function useDeleteProjectGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, projectId }: { goalId: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-goals", variables.projectId] });
      toast({
        title: "Goal deleted",
        description: "Project goal has been deleted",
      });
    },
  });
}
