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
  DialogFooter,
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
  Search,
  BookOpen,
  Pencil,
  Trash2,
  MoreHorizontal,
  Link2,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  Tag,
  Star,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Types
type SOP = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content: string;
  steps?: any;
  owner?: string;
  status: 'active' | 'draft' | 'archived';
  frequency?: string;
  category?: string;
  tags?: string[];
  version: string;
  linked_principle_id?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
};

type Principle = {
  id: string;
  title: string;
};

type Project = {
  id: string;
  name: string;
};

type LinkedItem = {
  id: string;
  type: "document" | "project";
  title: string;
  confidence?: number;
};

type AlignmentStats = {
  documents: number;
  projects: number;
  linkedItems: LinkedItem[];
};

// Utilities
function statusColor(s: string) {
  switch (s) {
    case "active": return "bg-green-500/20 text-green-700 dark:text-green-300";
    case "draft": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    case "archived": return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
    default: return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
  }
}

function statusBadge(s: string) {
  return <Badge className={statusColor(s)}>{s}</Badge>;
}

// Hooks
function useSOPs() {
  return useQuery({
    queryKey: ["sops"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SOP[];
    },
  });
}

function usePrinciples() {
  return useQuery({
    queryKey: ["principles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("principles")
        .select("id, title")
        .eq("user_id", user.id);
      return (data || []) as Principle[];
    },
  });
}

function useProjects() {
  return useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);
      return (data || []) as Project[];
    },
  });
}

function useAlignmentStats(sopId: string) {
  return useQuery({
    queryKey: ["sop-alignment", sopId],
    queryFn: async () => {
      // Fetch documents linked to this SOP
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, principle_alignment_score, user_override")
        .eq("linked_sop_id", sopId);

      // Fetch projects using this SOP
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", sopId); // TODO: Add proper project-sop relationship

      const linkedItems: LinkedItem[] = [
        ...(docs || []).map((d) => ({
          id: d.id,
          type: "document" as const,
          title: d.title,
          confidence: d.user_override ? undefined : d.principle_alignment_score || 0,
        })),
        ...(projects || []).map((p) => ({
          id: p.id,
          type: "project" as const,
          title: p.name,
          confidence: 85, // Default confidence for manually linked items
        })),
      ];

      return {
        documents: docs?.length || 0,
        projects: projects?.length || 0,
        linkedItems,
      };
    },
  });
}

// SOP Form Dialog
function SOPFormDialog({
  onSave,
  initial,
  trigger,
  principles,
  projects,
}: {
  onSave: (sop: Partial<SOP>) => void;
  initial?: SOP | null;
  trigger?: React.ReactNode;
  principles: Principle[];
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [steps, setSteps] = useState(
    initial?.steps
      ? typeof initial.steps === "string"
        ? initial.steps
        : JSON.stringify(initial.steps, null, 2)
      : ""
  );
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "ad-hoc");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [version, setVersion] = useState(initial?.version ?? "1.0");
  const [principleId, setPrincipleId] = useState(initial?.linked_principle_id ?? "");
  const [projectId, setProjectId] = useState(initial?.project_id ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);

  const addTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    if (!tags.includes(val)) setTags((t) => [...t, val]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((x) => x.filter((y) => y !== t));

  const handleSave = () => {
    if (!title.trim()) return;
    
    let parsedSteps;
    try {
      parsedSteps = steps.trim() ? JSON.parse(steps) : [];
    } catch {
      parsedSteps = steps.split("\n").filter((s) => s.trim());
    }

    onSave({
      id: initial?.id,
      title,
      description,
      content,
      steps: parsedSteps,
      owner,
      status,
      frequency,
      category,
      version,
      linked_principle_id: principleId || undefined,
      project_id: projectId || undefined,
      tags,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="rounded-2xl">
            <Plus className="h-4 w-4 mr-2" />
            New SOP
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit SOP" : "New Standard Operating Procedure"}</DialogTitle>
          <DialogDescription>
            Define a repeatable process to maintain consistency and quality.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client Onboarding Process"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of this SOP"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Full SOP content and context"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="steps">Steps (JSON array or line-separated)</Label>
            <Textarea
              id="steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={6}
              placeholder='["Step 1", "Step 2"] or one step per line'
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Who owns this process"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Operations"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="principle">Linked Principle</Label>
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
              <Label htmlFor="project">Linked Project (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {initial ? "Save Changes" : "Create SOP"}
            </Button>
          </DialogFooter>
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
        No alignments yet. They'll appear once documents/projects are linked.
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

// SOP Card
function SOPCard({
  sop,
  onEdit,
  onDelete,
  alignmentStats,
  principle,
  project,
}: {
  sop: SOP;
  onEdit: (sop: SOP) => void;
  onDelete: (id: string) => void;
  alignmentStats: AlignmentStats;
  principle?: Principle;
  project?: Project;
}) {
  const stepsArray = Array.isArray(sop.steps)
    ? sop.steps
    : typeof sop.steps === "string"
    ? sop.steps.split("\n").filter((s) => s.trim())
    : [];

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {sop.title}
                  {statusBadge(sop.status)}
                </CardTitle>
              </div>
              {sop.description && (
                <CardDescription className="text-sm leading-relaxed">
                  {sop.description}
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
                <DropdownMenuItem onClick={() => onEdit(sop)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(sop.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {sop.frequency && (
              <Badge variant="outline" className="capitalize">
                <Calendar className="h-3 w-3 mr-1" />
                {sop.frequency}
              </Badge>
            )}
            {sop.owner && (
              <Badge variant="outline">
                <User className="h-3 w-3 mr-1" />
                {sop.owner}
              </Badge>
            )}
            {principle && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                {principle.title}
              </Badge>
            )}
            {project && (
              <Badge variant="outline" className="gap-1">
                <FolderOpen className="h-3 w-3" />
                {project.name}
              </Badge>
            )}
            {sop.tags?.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full">
                #{t}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Docs:{" "}
              <strong>{alignmentStats.documents}</strong>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Projects:{" "}
              <strong>{alignmentStats.projects}</strong>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              v{sop.version}
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="alignments">Alignments</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-2 pt-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {sop.content || "No content provided."}
              </p>
            </TabsContent>
            <TabsContent value="steps" className="pt-2">
              {stepsArray.length > 0 ? (
                <ol className="space-y-2 list-decimal list-inside">
                  {stepsArray.map((step: any, i: number) => {
                    const stepText = typeof step === "string" ? step : step.title || step.detail || JSON.stringify(step);
                    return (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="flex-1">{stepText}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No steps defined.</p>
              )}
            </TabsContent>
            <TabsContent value="alignments" className="pt-2">
              <AlignmentTable items={alignmentStats.linkedItems} />
            </TabsContent>
            <TabsContent value="about" className="pt-2 space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Last updated: </span>
                <span>{new Date(sop.updated_at).toLocaleDateString()}</span>
              </div>
              {sop.category && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Category: </span>
                  <span>{sop.category}</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Component
export default function SOPs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrequency, setFilterFrequency] = useState<string>("all");
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sops = [], isLoading } = useSOPs();
  const { data: principles = [] } = usePrinciples();
  const { data: projects = [] } = useProjects();

  const createMutation = useMutation({
    mutationFn: async (sopData: Partial<SOP>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sops").insert([{ 
        ...sopData, 
        user_id: user.id,
        content: sopData.content || "",
        title: sopData.title || "Untitled SOP",
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast({ title: "SOP created", description: "Standard Operating Procedure created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (sopData: Partial<SOP>) => {
      const { error } = await supabase.from("sops").update(sopData).eq("id", sopData.id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast({ title: "SOP updated", description: "Standard Operating Procedure updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast({ title: "SOP deleted", description: "Standard Operating Procedure deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (sopData: Partial<SOP>) => {
    if (sopData.id) {
      updateMutation.mutate(sopData);
    } else {
      createMutation.mutate(sopData);
    }
    setEditingSOP(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this SOP?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSOPs = useMemo(() => {
    return sops.filter((sop) => {
      const matchesSearch =
        searchQuery === "" ||
        sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || sop.status === filterStatus;
      const matchesFrequency = filterFrequency === "all" || sop.frequency === filterFrequency;
      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [sops, searchQuery, filterStatus, filterFrequency]);

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
                Standard Operating Procedures
              </h1>
              <p className="text-muted-foreground">Define and manage repeatable processes</p>
            </div>
          </div>
          <SOPFormDialog
            onSave={handleSave}
            initial={editingSOP}
            principles={principles}
            projects={projects}
          />
        </div>

        {/* Search and Filters */}
        <Card className="rounded-2xl shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SOPs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterFrequency} onValueChange={setFilterFrequency}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOPs Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading SOPs...</p>
        </div>
      ) : filteredSOPs.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || filterStatus !== "all" || filterFrequency !== "all"
                ? "No matching SOPs"
                : "No SOPs yet"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery || filterStatus !== "all" || filterFrequency !== "all"
                ? "Try adjusting your filters"
                : "Create your first Standard Operating Procedure"}
            </p>
            {!(searchQuery || filterStatus !== "all" || filterFrequency !== "all") && (
              <SOPFormDialog onSave={handleSave} principles={principles} projects={projects} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSOPs.map((sop) => {
            const { data: alignmentStats } = useAlignmentStats(sop.id);
            const principle = principles.find((p) => p.id === sop.linked_principle_id);
            const project = projects.find((p) => p.id === sop.project_id);
            
            return (
              <SOPCard
                key={sop.id}
                sop={sop}
                onEdit={setEditingSOP}
                onDelete={handleDelete}
                alignmentStats={alignmentStats || { documents: 0, projects: 0, linkedItems: [] }}
                principle={principle}
                project={project}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
