import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  Calendar,
  User,
  Flag,
  Trash2,
  Edit,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Star,
  FolderOpen,
} from "lucide-react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, Task } from "@/hooks/useTask";
import { TaskDialog } from "@/components/workflow/TaskDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
type Principle = {
  id: string;
  title: string;
};

type Project = {
  id: string;
  name: string;
};

// Kanban columns with status mapping
const columns = [
  { id: "pending", title: "To Do", color: "border-blue-500" },
  { id: "in_progress", title: "In Progress", color: "border-yellow-500" },
  { id: "blocked", title: "Blocked", color: "border-orange-500" },
  { id: "completed", title: "Done", color: "border-green-500" },
  { id: "deferred", title: "Deferred", color: "border-gray-500" },
];

const priorityColors = {
  urgent: "bg-red-600/20 text-red-600 border-red-600/30",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

// Confidence dot color
function confidenceColor(c?: number) {
  if (c === undefined) return "bg-gray-400";
  if (c >= 80) return "bg-green-500";
  if (c >= 60) return "bg-yellow-500";
  return "bg-orange-500";
}

export default function Workflow() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks, projects, principles
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(
    selectedProject === "all" ? undefined : selectedProject
  );
  
  const { data: projects } = useQuery({
    queryKey: ["projects-workflow"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("user_id", user.id);
      return (data || []) as Project[];
    },
  });

  const { data: principles } = useQuery({
    queryKey: ["principles-workflow"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("principles").select("id, title").eq("user_id", user.id);
      return (data || []) as Principle[];
    },
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Log task activity
  const logActivity = useMutation({
    mutationFn: async ({ taskId, event, meta }: { taskId: string; event: string; meta?: any }) => {
      const { error } = await supabase.from("task_activity").insert({
        task_id: taskId,
        event,
        meta: meta || {},
      });
      if (error) throw error;
    },
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
      const matchesSource = filterSource === "all" || (task as any).source === filterSource;
      return matchesSearch && matchesPriority && matchesSource;
    });
  }, [allTasks, searchQuery, filterPriority, filterSource]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      completed: [],
      deferred: [],
    };
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) grouped[task.status].push(task);
    });
    // Sort within each column: priority desc, due_date asc, updated_at desc
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const ap = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bp = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        if (ap !== bp) return bp - ap;
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    });
    return grouped;
  }, [filteredTasks]);

  // Insights calculations
  const insights = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdue = filteredTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < today && t.status !== "completed"
    ).length;
    const dueToday = filteredTasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date).toDateString() === today.toDateString() &&
        t.status !== "completed"
    ).length;
    const wip = filteredTasks.filter((t) => t.status === "in_progress").length;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completed7d = filteredTasks.filter(
      (t) => t.status === "completed" && new Date(t.updated_at) >= sevenDaysAgo
    ).length;
    const created7d = filteredTasks.filter((t) => new Date(t.created_at) >= sevenDaysAgo).length;
    const completionRate = created7d > 0 ? Math.round((completed7d / created7d) * 100) : 0;
    const linkedToPrinciple = filteredTasks.filter((t) => (t as any).primary_principle_id).length;
    const focusAdherence =
      filteredTasks.length > 0 ? Math.round((linkedToPrinciple / filteredTasks.length) * 100) : 0;
    return { overdue, dueToday, wip, completionRate, focusAdherence };
  }, [filteredTasks]);

  // Drag and drop handler
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;
    if (
      !destination ||
      (destination.droppableId === source.droppableId && destination.index === source.index)
    ) {
      return;
    }
    const newStatus = destination.droppableId;
    const taskData: any = { id: draggableId, status: newStatus };
    if (newStatus === "completed") {
      taskData.completed_at = new Date().toISOString();
    }
    updateTask.mutate(taskData, {
      onSuccess: () => {
        logActivity.mutate({ taskId: draggableId, event: "status_changed", meta: { newStatus } });
        toast({ title: "Task updated", description: `Moved to ${columns.find((c) => c.id === newStatus)?.title}` });
      },
    });
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskData.id) {
      updateTask.mutate(taskData as Task & { id: string }, {
        onSuccess: () => {
          logActivity.mutate({ taskId: taskData.id!, event: "edited" });
          toast({ title: "Task updated" });
        },
      });
    } else {
      createTask.mutate(taskData as any, {
        onSuccess: (data: any) => {
          if (data?.id) {
            logActivity.mutate({ taskId: data.id, event: "created" });
          }
          toast({ title: "Task created" });
        },
      });
    }
    setEditingTask(null);
    setTaskDialogOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(taskId, {
        onSuccess: () => toast({ title: "Task deleted" }),
      });
    }
  };

  const handleQuickComplete = (task: Task) => {
    updateTask.mutate(
      { id: task.id, status: "completed", completed_at: new Date().toISOString() } as any,
      {
        onSuccess: () => {
          logActivity.mutate({ taskId: task.id, event: "completed" });
          toast({ title: "Task completed", description: task.title });
        },
      }
    );
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
            Workflow
          </h1>
          <p className="text-muted-foreground mt-1">Manage tasks with intelligent prioritization</p>
        </div>
        <Button
          className="bg-gradient-primary shadow-royal hover:shadow-glow transition-royal"
          onClick={() => {
            setEditingTask(null);
            setTaskDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Insights Strip */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{insights.overdue + insights.dueToday}</div>
                <div className="text-xs text-muted-foreground">Due Today / Overdue</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{insights.wip}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{insights.completionRate}%</div>
                <div className="text-xs text-muted-foreground">7-Day Completion</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{insights.focusAdherence}%</div>
                <div className="text-xs text-muted-foreground">Focus Adherence</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredTasks.length}</div>
                <div className="text-xs text-muted-foreground">Active Tasks</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px] rounded-xl">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="daily_focus">Daily Focus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {columns.map((column) => (
            <Card key={column.id} className={`rounded-2xl shadow-sm ${column.color} border-l-4`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{column.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tasksByStatus[column.id]?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-[500px] ${
                        snapshot.isDraggingOver ? "bg-muted/30 rounded-lg p-1" : ""
                      }`}
                    >
                      {tasksByStatus[column.id]?.map((task, index) => {
                        const principle = principles?.find((p) => p.id === (task as any).primary_principle_id);
                        const project = projects?.find((p) => p.id === task.project_id);
                        const isOverdue =
                          task.due_date &&
                          new Date(task.due_date) < new Date() &&
                          task.status !== "completed";
                        
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 rounded-lg bg-card border hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg rotate-1" : ""
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-sm flex-1 line-clamp-2">
                                      {task.title}
                                    </h4>
                                    <div className="flex items-center gap-1">
                                      {(task as any).confidence !== undefined && (
                                        <div
                                          className={`w-2 h-2 rounded-full ${confidenceColor(
                                            (task as any).confidence
                                          )}`}
                                          title={`Confidence: ${(task as any).confidence}%`}
                                        />
                                      )}
                                      {task.status !== "completed" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleQuickComplete(task)}
                                          title="Quick complete"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleEditTask(task)}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive"
                                        onClick={() => handleDeleteTask(task.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    <Badge className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}>
                                      <Flag className="w-2 h-2 mr-1" />
                                      {task.priority}
                                    </Badge>
                                    {principle && (
                                      <Badge variant="outline" className="text-xs">
                                        <Star className="w-2 h-2 mr-1" />
                                        {principle.title.slice(0, 12)}
                                      </Badge>
                                    )}
                                    {project && (
                                      <Badge variant="outline" className="text-xs">
                                        <FolderOpen className="w-2 h-2 mr-1" />
                                        {project.name.slice(0, 12)}
                                      </Badge>
                                    )}
                                    {(task as any).source && (task as any).source !== "manual" && (
                                      <Badge variant="secondary" className="text-xs">
                                        {(task as any).source}
                                      </Badge>
                                    )}
                                  </div>

                                  {task.due_date && (
                                    <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                                      <Calendar className="w-3 h-3" />
                                      {new Date(task.due_date).toLocaleDateString()}
                                      {isOverdue && " (Overdue)"}
                                    </div>
                                  )}

                                  {task.assignee && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      {task.assignee}
                                    </div>
                                  )}

                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags.slice(0, 2).map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {tasksByStatus[column.id]?.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No tasks yet
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleSaveTask}
        task={editingTask}
        projectId={selectedProject === "all" ? undefined : selectedProject}
      />
    </div>
  );
}
