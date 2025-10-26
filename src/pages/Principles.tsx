import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Lightbulb, Edit, Trash2, Star, Layers, FileText, FolderOpen, BookOpen, TrendingUp, CheckCircle2, AlertCircle, Search, Filter, Link2, Target, Gauge, Sparkles, MoreHorizontal, Tag, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Principle = {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  type: 'core' | 'aspirational';
  tags: string[];
  created_at: string;
  updated_at: string;
};

type LinkedItem = {
  id: string;
  type: "document" | "project" | "sop";
  title: string;
  confidence: number;
  overridden?: boolean;
};

type AlignmentStats = {
  documents: number;
  projects: number;
  sops: number;
  avgConfidence: number;
  linkedItems: LinkedItem[];
};

export default function Principles() {
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinciple, setEditingPrinciple] = useState<Principle | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyCore, setOnlyCore] = useState(false);
  const [onlyAspirational, setOnlyAspirational] = useState(false);
  const [alignmentStats, setAlignmentStats] = useState<Record<string, AlignmentStats>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "",
    priority: "medium" as 'low' | 'medium' | 'high',
    type: "core" as 'core' | 'aspirational',
    tags: [] as string[],
    tagInput: "",
  });

  useEffect(() => {
    fetchPrinciples();
  }, []);

  useEffect(() => {
    if (principles.length > 0) {
      fetchAlignmentStats();
    }
  }, [principles]);

  const fetchPrinciples = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view principles",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('principles')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPrinciples((data as Principle[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching principles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlignmentStats = async () => {
    try {
      const stats: Record<string, AlignmentStats> = {};
      
      for (const principle of principles) {
        const linkedItems: LinkedItem[] = [];
        
        // Fetch documents aligned to this principle
        const { data: docs } = await supabase
          .from('documents')
          .select('id, title, principle_alignment_score, user_override')
          .or(`primary_principle_id.eq.${principle.id},linked_principle_id.eq.${principle.id}`);

        // Fetch projects aligned to this principle
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('primary_principle_id', principle.id);

        // Fetch SOPs aligned to this principle
        const { data: sops } = await supabase
          .from('sops')
          .select('id, title')
          .eq('linked_principle_id', principle.id);

        // Add documents to linked items
        if (docs) {
          linkedItems.push(...docs.map(doc => ({
            id: doc.id,
            type: "document" as const,
            title: doc.title,
            confidence: doc.principle_alignment_score || 0,
            overridden: doc.user_override || false,
          })));
        }

        // Add projects to linked items
        if (projects) {
          linkedItems.push(...projects.map(proj => ({
            id: proj.id,
            type: "project" as const,
            title: proj.name,
            confidence: 85, // Default confidence for manual links
            overridden: false,
          })));
        }

        // Add SOPs to linked items
        if (sops) {
          linkedItems.push(...sops.map(sop => ({
            id: sop.id,
            type: "sop" as const,
            title: sop.title,
            confidence: 85, // Default confidence for manual links
            overridden: false,
          })));
        }

        const avgConfidence = linkedItems.length > 0
          ? linkedItems.reduce((sum, item) => sum + item.confidence, 0) / linkedItems.length
          : 0;

        stats[principle.id] = {
          documents: docs?.length || 0,
          projects: projects?.length || 0,
          sops: sops?.length || 0,
          avgConfidence: Math.round(avgConfidence),
          linkedItems,
        };
      }
      
      setAlignmentStats(stats);
    } catch (error: any) {
      toast({
        title: "Error fetching alignment stats",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const principleData = {
        ...formData,
        user_id: user.id,
      };

      if (editingPrinciple) {
        const { error } = await supabase
          .from('principles')
          .update(principleData)
          .eq('id', editingPrinciple.id);

        if (error) throw error;
        
        toast({
          title: "Principle updated",
          description: "Your principle has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('principles')
          .insert([principleData]);

        if (error) throw error;
        
        toast({
          title: "Principle created",
          description: "Your principle has been created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchPrinciples();
    } catch (error: any) {
      toast({
        title: "Error saving principle",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (principle: Principle) => {
    setEditingPrinciple(principle);
    setFormData({
      title: principle.title,
      description: principle.description || "",
      content: principle.content,
      category: principle.category || "",
      priority: principle.priority,
      type: principle.type || 'core',
      tags: principle.tags || [],
      tagInput: "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this principle?")) return;

    try {
      const { error } = await supabase
        .from('principles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Principle deleted",
        description: "Your principle has been deleted",
      });
      
      fetchPrinciples();
    } catch (error: any) {
      toast({
        title: "Error deleting principle",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      category: "",
      priority: "medium",
      type: "core",
      tags: [],
      tagInput: "",
    });
    setEditingPrinciple(null);
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: "",
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const filteredPrinciples = useMemo(() => {
    return principles.filter((p) => {
      const matchesQuery =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.content && p.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPriority = filterPriority === "all" || p.priority === filterPriority;
      const matchesType = filterType === "all" || p.type === filterType;
      const matchesCore = !onlyCore || p.type === 'core';
      const matchesAspirational = !onlyAspirational || p.type === 'aspirational';
      
      return matchesQuery && matchesPriority && matchesType && matchesCore && matchesAspirational;
    });
  }, [principles, searchQuery, filterPriority, filterType, onlyCore, onlyAspirational]);

  const priorityColors = {
    low: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    high: "bg-red-500/20 text-red-700 dark:text-red-300",
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    if (confidence >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-subtle">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
                Guiding Principles
              </h1>
              <p className="text-muted-foreground">Define and evolve your guiding principles that anchor all analysis and decisions</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-royal hover:shadow-glow transition-royal rounded-2xl">
                <Plus className="w-4 h-4 mr-2" />
                New Principle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingPrinciple ? "Edit Principle" : "Create New Principle"}</DialogTitle>
                  <DialogDescription>
                    Define a guiding principle for your work and decisions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="content">Full Content *</Label>
                    <Textarea
                      id="content"
                      rows={10}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      placeholder="Explain the principle, its importance, and how it applies to your work..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'core' | 'aspirational') => 
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core">Core Principle</SelectItem>
                          <SelectItem value="aspirational">Aspirational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high') => 
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Leadership, Strategy"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        value={formData.tagInput}
                        onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add a tag and press Enter"
                      />
                      <Button type="button" onClick={handleAddTag} variant="outline">
                        Add
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
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
                    {editingPrinciple ? "Update" : "Create"} Principle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <Input 
                className="pl-9" 
                placeholder="Search principles, descriptions, tags…" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4"/>
              <div className="flex items-center gap-2">
                <Switch id="onlyCore" checked={onlyCore} onCheckedChange={setOnlyCore} />
                <Label htmlFor="onlyCore" className="text-sm">Core only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="onlyAsp" checked={onlyAspirational} onCheckedChange={setOnlyAspirational} />
                <Label htmlFor="onlyAsp" className="text-sm">Aspirational</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Principles Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading principles...</p>
        </div>
      ) : filteredPrinciples.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No principles yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first guiding principle to establish your core values
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Principle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPrinciples.map((principle) => {
            const stats = alignmentStats[principle.id] || { 
              documents: 0, 
              projects: 0, 
              sops: 0, 
              avgConfidence: 0,
              linkedItems: []
            };
            const totalAligned = stats.documents + stats.projects + stats.sops;
            
            return (
              <motion.div
                key={principle.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full"
              >
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {principle.type === 'core' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700">Core</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-sky-600 text-white hover:bg-sky-700">
                              Aspirational
                            </Badge>
                          )}
                          <Badge className={priorityColors[principle.priority]}>
                            {principle.priority}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{principle.title}</CardTitle>
                        {principle.description && (
                          <CardDescription className="text-sm leading-relaxed">
                            {principle.description}
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
                          <DropdownMenuItem onClick={() => handleEdit(principle)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => handleDelete(principle.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    {principle.tags && principle.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {principle.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="rounded-full">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        <span className="text-muted-foreground">Docs:</span>
                        <strong>{stats.documents}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span className="text-muted-foreground">Proj:</span>
                        <strong>{stats.projects}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-muted-foreground">SOPs:</span>
                        <strong>{stats.sops}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        <span className="text-muted-foreground">Conf:</span>
                        <strong>{stats.avgConfidence}%</strong>
                      </div>
                    </div>

                    <Tabs defaultValue="alignments" className="flex-1">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="alignments">Alignments</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                      </TabsList>
                      <TabsContent value="alignments" className="space-y-3">
                        {!stats.linkedItems || stats.linkedItems.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-4">
                            No alignments yet. They'll appear once documents/projects are analyzed.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[80px]">Type</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="w-[100px]">Conf.</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats.linkedItems.slice(0, 5).map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="capitalize text-xs">
                                    {item.type}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs flex items-center gap-1">
                                    <Link2 className="h-3 w-3" />
                                    <span className="truncate">{item.title}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress className="h-1.5 w-full" value={item.confidence} />
                                      <span 
                                        className={`h-2 w-2 rounded-full ${getConfidenceColor(item.confidence)}`} 
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {stats.linkedItems && stats.linkedItems.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{stats.linkedItems.length - 5} more items
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent value="about" className="space-y-2">
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {principle.content}
                        </p>
                        {principle.category && (
                          <div className="flex items-center gap-2 text-sm pt-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{principle.category}</span>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground pt-2">
                          Last updated {new Date(principle.updated_at).toLocaleString()}.
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}