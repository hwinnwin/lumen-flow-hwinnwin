import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Workflow as WorkflowIcon, Plus, Calendar, User, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { chakraCategories, type ChakraCategory } from "@/lib/chakraSystem";

const initialTasks = {
  todo: [
    {
      id: "task-1",
      title: "Review Q4 Strategy Document",
      description: "Comprehensive review of strategic planning document for next quarter",
      priority: "high",
      assignee: "You",
      dueDate: "2024-01-15",
      tags: ["strategy", "review"],
      chakra_category: "crown" as ChakraCategory // Strategic thinking, higher consciousness
    },
    {
      id: "task-2",
      title: "Update Customer Onboarding Flow",
      description: "Improve the customer onboarding experience based on recent feedback",
      priority: "medium",
      assignee: "Design Team",
      dueDate: "2024-01-20",
      tags: ["ux", "onboarding"],
      chakra_category: "heart" as ChakraCategory // Empathy, connection with users
    },
    {
      id: "task-3",
      title: "Implement New Analytics Dashboard",
      description: "Build comprehensive analytics dashboard for executive reporting",
      priority: "low",
      assignee: "Dev Team",
      dueDate: "2024-01-25",
      tags: ["development", "analytics"],
      chakra_category: "third_eye" as ChakraCategory // Vision, data analysis
    }
  ],
  doing: [
    {
      id: "task-4",
      title: "Prepare Client Presentation",
      description: "Create presentation for upcoming client meeting including ROI analysis",
      priority: "high",
      assignee: "You",
      dueDate: "2024-01-12",
      tags: ["presentation", "client"],
      chakra_category: "throat" as ChakraCategory // Communication, expression
    },
    {
      id: "task-5",
      title: "Conduct Team Performance Reviews",
      description: "Quarterly performance reviews for engineering team members",
      priority: "medium",
      assignee: "HR Team",
      dueDate: "2024-01-18",
      tags: ["hr", "reviews"],
      chakra_category: "heart" as ChakraCategory // Compassion, human connection
    }
  ],
  done: [
    {
      id: "task-6",
      title: "Launch Marketing Campaign",
      description: "Successfully launched Q1 marketing campaign across all channels",
      priority: "high",
      assignee: "Marketing Team",
      dueDate: "2024-01-10",
      tags: ["marketing", "campaign"],
      chakra_category: "sacral" as ChakraCategory // Creativity, emotional connection
    },
    {
      id: "task-7",
      title: "Security Audit Completion",
      description: "Completed comprehensive security audit of all systems",
      priority: "high",
      assignee: "Security Team",
      dueDate: "2024-01-08",
      tags: ["security", "audit"],
      chakra_category: "root" as ChakraCategory // Safety, foundation, security
    }
  ]
};

const columns = [
  { id: "todo", title: "To Do", color: "border-blue-500" },
  { id: "doing", title: "In Progress", color: "border-yellow-500" },
  { id: "done", title: "Done", color: "border-green-500" }
];

const priorityColors = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20"
};

export default function Workflow() {
  const [tasks, setTasks] = useState(initialTasks);

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = tasks[source.droppableId as keyof typeof tasks];
    const destColumn = tasks[destination.droppableId as keyof typeof tasks];
    const draggedTask = sourceColumn.find(task => task.id === draggableId);

    if (!draggedTask) return;

    const newSourceColumn = sourceColumn.filter(task => task.id !== draggableId);
    const newDestColumn = [...destColumn];
    newDestColumn.splice(destination.index, 0, draggedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: newSourceColumn,
      [destination.droppableId]: newDestColumn
    });
  };

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
        <Button 
          className="bg-gradient-primary text-primary-foreground shadow-royal"
          onClick={() => toast({
            title: "Add Task",
            description: "Task creation coming soon with backend integration.",
          })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Object.values(tasks).flat().length}
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
                <p className="text-2xl font-bold text-foreground">{tasks.todo.length}</p>
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
                <p className="text-2xl font-bold text-foreground">{tasks.doing.length}</p>
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
                <p className="text-2xl font-bold text-foreground">{tasks.done.length}</p>
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
                    {tasks[column.id as keyof typeof tasks].length}
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
                      {tasks[column.id as keyof typeof tasks].map((task, index) => (
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
                                  <div className="flex items-center gap-2">
                                    {/* Chakra Energy Indicator */}
                                    <div 
                                      className="relative flex items-center gap-1.5 px-2 py-1 rounded-md border"
                                      style={{
                                        borderColor: `hsl(${chakraCategories[task.chakra_category].color})`,
                                        backgroundColor: `hsl(${chakraCategories[task.chakra_category].color} / 0.1)`
                                      }}
                                      title={`${chakraCategories[task.chakra_category].label} Energy: ${chakraCategories[task.chakra_category].description}`}
                                    >
                                      <div 
                                        className="w-2 h-2 rounded-full animate-pulse"
                                        style={{
                                          backgroundColor: `hsl(${chakraCategories[task.chakra_category].color})`
                                        }}
                                      />
                                      <span 
                                        className="text-xs font-medium"
                                        style={{
                                          color: `hsl(${chakraCategories[task.chakra_category].color})`
                                        }}
                                      >
                                        {chakraCategories[task.chakra_category].label}
                                      </span>
                                    </div>
                                    {/* Priority Badge */}
                                    <Badge 
                                      className={priorityColors[task.priority as keyof typeof priorityColors]}
                                    >
                                      <Flag className="w-3 h-3 mr-1" />
                                      {task.priority}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {task.assignee}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {task.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
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
    </div>
  );
}