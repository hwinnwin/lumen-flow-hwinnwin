import { useState, useEffect } from "react";
import { Plus, FolderOpen, Edit, Trash2, Target, CheckCircle2, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useProjectGoals, useCreateProjectGoal, useUpdateProjectGoal, useDeleteProjectGoal, Project, ProjectGoal } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

type Principle = {
  id: string;
  title: string;
};

export default function Projects() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<ProjectGoal | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const { data: principles = [] } = useQuery({
    queryKey: ["principles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("principles")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data as Principle[];
    },
  });

  const { data: projectGoals = [] } = useProjectGoals(selectedProject || undefined);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createGoal = useCreateProjectGoal();
  const updateGoal = useUpdateProjectGoal();
  const deleteGoal = useDeleteProjectGoal();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    icon: "folder",
    primary_principle_id: "",
  });

  const [goalFormData, setGoalFormData] = useState({
    title: "",
    description: "",
    target_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      ...formData,
      primary_principle_id: formData.primary_principle_id || null,
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, ...projectData });
    } else {
      createProject.mutate(projectData as any);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) return;

    const goalData = {
      ...goalFormData,
      project_id: selectedProject,
      target_date: goalFormData.target_date || null,
    };

    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, project_id: selectedProject, ...goalData } as any);
    } else {
      createGoal.mutate(goalData as any);
    }

    setGoalDialogOpen(false);
    resetGoalForm();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      color: project.color || "#3b82f6",
      icon: project.icon || "folder",
      primary_principle_id: project.primary_principle_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project? All associated tasks and goals will remain but be unlinked.")) {
      deleteProject.mutate(id);
    }
  };

  const handleEditGoal = (goal: ProjectGoal) => {
    setEditingGoal(goal);
    setGoalFormData({
      title: goal.title,
      description: goal.description || "",
      target_date: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : "",
    });
    setGoalDialogOpen(true);
  };

  const handleToggleGoalComplete = (goal: ProjectGoal) => {
    if (!selectedProject) return;
    
    updateGoal.mutate({
      id: goal.id,
      project_id: selectedProject,
      completed: !goal.completed,
      completed_at: !goal.completed ? new Date().toISOString() : null,
    } as any);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!selectedProject) return;
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoal.mutate({ goalId, projectId: selectedProject });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      icon: "folder",
      primary_principle_id: "",
    });
    setEditingProject(null);
  };

  const resetGoalForm = () => {
    setGoalFormData({
      title: "",
      description: "",
      target_date: "",
    });
    setEditingGoal(null);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const completedGoals = projectGoals.filter(g => g.completed).length;
  const progressPercentage = projectGoals.length > 0 
    ? (completedGoals / projectGoals.length) * 100 
    : 0;

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
                Projects
              </h1>
              <p className="text-muted-foreground">Organize your work into focused projects</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-royal hover:shadow-glow transition-royal">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                  <DialogDescription>
                    Define a project to organize your tasks and goals
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What is this project about?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="principle">Primary Principle</Label>
                      <Select
                        value={formData.primary_principle_id}
                        onValueChange={(value) => setFormData({ ...formData, primary_principle_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select principle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {principles.map((principle) => (
                            <SelectItem key={principle.id} value={principle.id}>
                              {principle.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-primary">
                    {editingProject ? "Update" : "Create"} Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start organizing your work
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Projects</h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`hover:shadow-card-hover transition-smooth cursor-pointer ${selectedProject === project.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${project.color}20` }}
                        >
                          <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          {project.description && (
                            <CardDescription className="line-clamp-1 mt-1">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(project)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Project Details & Goals */}
          <div className="space-y-4">
            {selectedProjectData ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Goals for {selectedProjectData.name}</h2>
                  <Dialog open={goalDialogOpen} onOpenChange={(open) => {
                    setGoalDialogOpen(open);
                    if (!open) resetGoalForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleGoalSubmit}>
                        <DialogHeader>
                          <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="goal-title">Goal Title *</Label>
                            <Input
                              id="goal-title"
                              value={goalFormData.title}
                              onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                              required
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="goal-description">Description</Label>
                            <Textarea
                              id="goal-description"
                              rows={3}
                              value={goalFormData.description}
                              onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="target-date">Target Date</Label>
                            <Input
                              id="target-date"
                              type="date"
                              value={goalFormData.target_date}
                              onChange={(e) => setGoalFormData({ ...goalFormData, target_date: e.target.value })}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => {
                            setGoalDialogOpen(false);
                            resetGoalForm();
                          }}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingGoal ? "Update" : "Create"} Goal
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Progress Card */}
                <Card className="bg-gradient-subtle">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Project Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Goals Completed</span>
                        <span className="font-semibold">
                          {completedGoals} / {projectGoals.length}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Goals List */}
                <div className="space-y-3">
                  {projectGoals.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <Target className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">No goals yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    projectGoals.map((goal) => (
                      <Card key={goal.id} className={goal.completed ? 'opacity-60' : ''}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleGoalComplete(goal)}
                              className="mt-1"
                            >
                              {goal.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1">
                              <h4 className={`font-semibold ${goal.completed ? 'line-through' : ''}`}>
                                {goal.title}
                              </h4>
                              {goal.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {goal.description}
                                </p>
                              )}
                              {goal.target_date && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Target: {new Date(goal.target_date).toLocaleDateString()}
                                  {!goal.completed && new Date(goal.target_date) < new Date() && (
                                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditGoal(goal)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteGoal(goal.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Select a project to view and manage its goals
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
