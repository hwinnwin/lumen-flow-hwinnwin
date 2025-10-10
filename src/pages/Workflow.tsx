import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Workflow as WorkflowIcon, Plus, Calendar, User, Flag, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, Task } from "@/hooks/useTask";
import { TaskDialog } from "@/components/workflow/TaskDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const columns = [
  { id: "pending", title: "To Do", color: "border-blue-500" },
  { id: "in_progress", title: "In Progress", color: "border-yellow-500" },
  { id: "completed", title: "Done", color: "border-green-500" }
];

const priorityColors = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20"
};

export default function Workflow() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [], isLoading } = useTasks(selectedProject || undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === "pending"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    completed: tasks.filter(t => t.status === "completed")
  };

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }

    updateTask.mutate({
      id: draggableId,
      status: destination.droppableId
    });
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskData.id) {
      updateTask.mutate(taskData as Task & { id: string });
    } else {
      createTask.mutate(taskData as any);
    }
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(taskId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
            Workflow
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks with a powerful Kanban board
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            className="bg-gradient-primary text-primary-foreground shadow-royal"
            onClick={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            disabled={!selectedProject}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {!selectedProject && (
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Please select a project to view and manage tasks
            </p>
          </CardContent>
        </Card>
      )}

      {selectedProject && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-subtle border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {tasks.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                  </div>
                  <WorkflowIcon className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-subtle border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{tasksByStatus.pending.length}</p>
                    <p className="text-sm text-muted-foreground">To Do</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-subtle border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{tasksByStatus.in_progress.length}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-subtle border-border shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{tasksByStatus.completed.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kanban Board */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {columns.map((column) => (
                <Card key={column.id} className={`bg-card border-border shadow-card ${column.color} border-l-4`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{column.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tasksByStatus[column.id as keyof typeof tasksByStatus].length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`space-y-3 min-h-[400px] ${
                            snapshot.isDraggingOver ? 'bg-muted/30 rounded-lg' : ''
                          }`}
                        >
                          {tasksByStatus[column.id as keyof typeof tasksByStatus].map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 rounded-lg bg-muted border border-border hover:shadow-glow transition-royal ${
                                    snapshot.isDragging ? 'shadow-royal rotate-2' : ''
                                  }`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-semibold text-foreground flex-1">{task.title}</h4>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleEditTask(task)}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-destructive"
                                          onClick={() => handleDeleteTask(task.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <Badge className={priorityColors[task.priority]}>
                                      <Flag className="w-3 h-3 mr-1" />
                                      {task.priority}
                                    </Badge>
                                    
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      {task.assignee && (
                                        <div className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {task.assignee}
                                        </div>
                                      )}
                                      {task.due_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(task.due_date).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {task.tags && task.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {task.tags.map((tag) => (
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
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DragDropContext>
        </>
      )}

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSave={handleSaveTask}
        task={editingTask}
        projectId={selectedProject}
      />
    </div>
  );
}
