import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Filter,
  Tag,
  Pencil,
  Trash2,
  MoreHorizontal,
  Search,
  Link2,
  Star,
  Target,
  Gauge,
  Layers,
  FolderOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Bookmark,
} from "lucide-react";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProjectGoals,
  Project,
} from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Types
type Principle = {
  id: string;
  title: string;
};

type LinkedItem = {
  id: string;
  type: "document" | "sop";
  title: string;
  confidence?: number;
};

type AlignmentStats = {
  documents: number;
  sops: number;
  linkedItems: LinkedItem[];
};

// Utilities
function priorityColor(p: string) {
  switch (p) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-green-500";
    default: return "bg-gray-500";
  }
}

function statusBadge(s: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
    active: { variant: "default", label: "Active" },
    planning: { variant: "secondary", label: "Planning" },
    "on-hold": { variant: "outline", label: "On Hold" },
    completed: { variant: "default", label: "Completed" },
    archived: { variant: "outline", label: "Archived" },
  };
  const config = variants[s] || { variant: "outline", label: s };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Project Form Dialog
function ProjectFormDialog({
  onSave,
  initial,
  trigger,
  principles,
}: {
  onSave: (p: Omit<Project, "id" | "user_id" | "created_at" | "updated_at"> & { id?: string }) => void;
  initial?: Project | null;
  trigger?: React.ReactNode;
  principles: Principle[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [deadline, setDeadline] = useState(
    initial?.deadline ? new Date(initial.deadline).toISOString().split("T")[0] : ""
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [principleId, setPrincipleId] = useState(initial?.primary_principle_id ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");

  const addTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    if (!tags.includes(val)) setTags((t) => [...t, val]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((x) => x.filter((y) => y !== t));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id,
      name,
      description,
      status,
      priority,
      deadline: deadline || undefined,
      category,
      primary_principle_id: principleId || undefined,
      tags,
      color,
      icon: initial?.icon || "folder",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="rounded-2xl">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            Define a project to organize your work and track progress toward goals.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Launch Lumen MVP"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What is this project about?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Product, Marketing"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="principle">Primary Principle</Label>
              <Select value={principleId} onValueChange={setPrincipleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select principle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {principles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) =>
                  e.key === "Enter" ? (e.preventDefault(), addTag()) : null
                }
              />
              <Button variant="outline" onClick={addTag}>
                <Tag className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map((t) => (
                <Badge
                  key={t}
                  className="cursor-pointer"
                  onClick={() => removeTag(t)}
                >
                  {t} ✕
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {initial ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Alignment Table
function AlignmentTable({ items }: { items: LinkedItem[] }) {
  if (!items?.length)
    return (
      <div className="text-sm text-muted-foreground">
        No alignments yet. They'll appear once documents/SOPs are linked.
      </div>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-[150px]">Confidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell className="capitalize">{it.type}</TableCell>
            <TableCell className="font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {it.title}
            </TableCell>
            <TableCell>
              {it.confidence !== undefined && (
                <div className="flex items-center gap-2">
                  <Progress className="h-2 w-20" value={it.confidence} />
                  <span className="text-sm tabular-nums">{it.confidence}%</span>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Project Card
function ProjectCard({
  p,
  onEdit,
  onDelete,
  alignmentStats,
  principle,
  goals,
}: {
  p: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  alignmentStats: AlignmentStats;
  principle?: Principle;
  goals: { total: number; completed: number };
}) {
  const progress = goals.total > 0 ? (goals.completed / goals.total) * 100 : 0;
  const daysUntilDeadline = p.deadline
    ? Math.ceil(
        (new Date(p.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${p.color}20` }}
                >
                  <FolderOpen className="w-4 h-4" style={{ color: p.color }} />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {p.name}
                  {statusBadge(p.status || "active")}
                </CardTitle>
              </div>
              {p.description && (
                <CardDescription className="text-sm leading-relaxed">
                  {p.description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onEdit(p)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(p.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {p.priority && (
              <Badge className={priorityColor(p.priority)}>
                {p.priority}
              </Badge>
            )}
            {principle && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                {principle.title}
              </Badge>
            )}
            {p.tags?.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full">
                #{t}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Docs:{" "}
              <strong>{alignmentStats.documents}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" /> SOPs:{" "}
              <strong>{alignmentStats.sops}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" /> Goals:{" "}
              <strong>
                {goals.completed}/{goals.total}
              </strong>
            </div>
            {daysUntilDeadline !== null && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {daysUntilDeadline > 0 ? (
                  <span>{daysUntilDeadline}d left</span>
                ) : daysUntilDeadline === 0 ? (
                  <span className="text-orange-500 font-semibold">Due today</span>
                ) : (
                  <span className="text-red-500 font-semibold">
                    {Math.abs(daysUntilDeadline)}d overdue
                  </span>
                )}
              </div>
            )}
          </div>

          {goals.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="alignments">Alignments</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-3">
              <div className="text-sm space-y-2">
                {p.category && (
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span className="font-medium">{p.category}</span>
                  </div>
                )}
                {p.deadline && (
                  <div>
                    <span className="text-muted-foreground">Deadline: </span>
                    <span className="font-medium">
                      {new Date(p.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="alignments" className="space-y-3">
              <AlignmentTable items={alignmentStats.linkedItems} />
            </TabsContent>
            <TabsContent value="about">
              <div className="text-sm text-muted-foreground">
                Last updated {new Date(p.updated_at).toLocaleString()}.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Page
export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [onlyWithDeadline, setOnlyWithDeadline] = useState(false);

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

  // Fetch alignment stats for all projects
  const { data: alignmentStatsMap = {} } = useQuery({
    queryKey: ["project-alignments"],
    queryFn: async () => {
      const stats: Record<string, AlignmentStats> = {};
      
      for (const project of projects) {
        const [docsResult, sopsResult] = await Promise.all([
          supabase
            .from("documents")
            .select("id, title, principle_alignment_score, user_override")
            .eq("linked_project_id", project.id),
          supabase
            .from("sops")
            .select("id, title")
            .eq("linked_principle_id", project.primary_principle_id || "none"),
        ]);

        const linkedItems: LinkedItem[] = [];

        if (docsResult.data) {
          docsResult.data.forEach((doc) => {
            linkedItems.push({
              id: doc.id,
              type: "document",
              title: doc.title,
              confidence: doc.principle_alignment_score || undefined,
            });
          });
        }

        if (sopsResult.data) {
          sopsResult.data.forEach((sop) => {
            linkedItems.push({
              id: sop.id,
              type: "sop",
              title: sop.title,
            });
          });
        }

        stats[project.id] = {
          documents: docsResult.data?.length || 0,
          sops: sopsResult.data?.length || 0,
          linkedItems,
        };
      }

      return stats;
    },
    enabled: projects.length > 0,
  });

  // Fetch goals count for all projects
  const { data: goalsMap = {} } = useQuery({
    queryKey: ["project-goals-summary"],
    queryFn: async () => {
      const goals: Record<string, { total: number; completed: number }> = {};
      
      for (const project of projects) {
        const { data } = await supabase
          .from("project_goals")
          .select("completed")
          .eq("project_id", project.id);

        goals[project.id] = {
          total: data?.length || 0,
          completed: data?.filter((g) => g.completed).length || 0,
        };
      }

      return goals;
    },
    enabled: projects.length > 0,
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      const matchesStatus = !filterStatus || p.status === filterStatus;
      const matchesPriority = !filterPriority || p.priority === filterPriority;
      const matchesDeadline = !onlyWithDeadline || !!p.deadline;
      return matchesQuery && matchesStatus && matchesPriority && matchesDeadline;
    });
  }, [projects, query, filterStatus, filterPriority, onlyWithDeadline]);

  const createOrUpdate = (data: Omit<Project, "id" | "user_id" | "created_at" | "updated_at"> & { id?: string }) => {
    if (data.id) {
      updateProject.mutate(data as any);
    } else {
      createProject.mutate(data as any);
    }
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this project? All associated goals will remain but be unlinked."
      )
    ) {
      deleteProject.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-muted-foreground">
            Organize your work into focused projects and track progress toward goals.
          </p>
        </div>
        <ProjectFormDialog
          onSave={createOrUpdate}
          principles={principles}
          trigger={
            <Button className="rounded-2xl">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          }
        />
      </div>

      <Card className="mb-6 rounded-2xl">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="onlyDeadline"
                checked={onlyWithDeadline}
                onCheckedChange={setOnlyWithDeadline}
              />
              <Label htmlFor="onlyDeadline">Has deadline</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {projects.length === 0 ? "No projects yet" : "No matching projects"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {projects.length === 0
                ? "Create your first project to start organizing your work"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              onEdit={(project) => {
                const editBtn = document.getElementById(`edit-${p.id}`) as HTMLButtonElement;
                editBtn?.click();
              }}
              onDelete={handleDelete}
              alignmentStats={alignmentStatsMap[p.id] || { documents: 0, sops: 0, linkedItems: [] }}
              principle={principles.find((pr) => pr.id === p.primary_principle_id)}
              goals={goalsMap[p.id] || { total: 0, completed: 0 }}
            />
          ))}
        </div>
      )}

      {/* Hidden edit dialogs */}
      <div className="hidden">
        {projects.map((p) => (
          <ProjectFormDialog
            key={p.id}
            initial={p}
            onSave={createOrUpdate}
            principles={principles}
            trigger={<button id={`edit-${p.id}`} />}
          />
        ))}
      </div>
    </div>
  );
}
