import { useState, useEffect } from "react";
import { Plus, Lightbulb, Edit, Trash2, Star, Layers, FileText, FolderOpen, BookOpen, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type AlignmentStats = {
  documents: number;
  projects: number;
  sops: number;
  avgConfidence: number;
};

export default function Principles() {
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinciple, setEditingPrinciple] = useState<Principle | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
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
        // Fetch documents aligned to this principle
        const { data: docs } = await supabase
          .from('documents')
          .select('principle_alignment_score')
          .or(`primary_principle_id.eq.${principle.id},linked_principle_id.eq.${principle.id}`);

        // Fetch projects aligned to this principle
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('primary_principle_id', principle.id);

        // Fetch SOPs aligned to this principle
        const { data: sops } = await supabase
          .from('sops')
          .select('id')
          .eq('linked_principle_id', principle.id);

        const avgConfidence = docs && docs.length > 0
          ? docs.reduce((sum, doc) => sum + (doc.principle_alignment_score || 0), 0) / docs.length
          : 0;

        stats[principle.id] = {
          documents: docs?.length || 0,
          projects: projects?.length || 0,
          sops: sops?.length || 0,
          avgConfidence: Math.round(avgConfidence),
        };
      }
      
      setAlignmentStats(stats);
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

  const filteredPrinciples = principles
    .filter(p => filterPriority === "all" || p.priority === filterPriority)
    .filter(p => filterType === "all" || p.type === filterType);

  const priorityColors = {
    low: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    high: "bg-red-500/20 text-red-700 dark:text-red-300",
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <Star className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
                Guiding Principles
              </h1>
              <p className="text-muted-foreground">Core values and philosophies that guide your work</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-royal hover:shadow-glow transition-royal">
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              All Types
            </Button>
            <Button
              variant={filterType === "core" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("core")}
            >
              Core ({principles.filter(p => p.type === 'core').length})
            </Button>
            <Button
              variant={filterType === "aspirational" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("aspirational")}
            >
              Aspirational ({principles.filter(p => p.type === 'aspirational').length})
            </Button>
          </div>
          
          <div className="h-8 w-px bg-border" />
          
          <div className="flex gap-2">
            <Button
              variant={filterPriority === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPriority("all")}
            >
              All Priorities
            </Button>
            <Button
              variant={filterPriority === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPriority("high")}
            >
              High ({principles.filter(p => p.priority === 'high').length})
            </Button>
            <Button
              variant={filterPriority === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPriority("medium")}
            >
              Medium ({principles.filter(p => p.priority === 'medium').length})
            </Button>
            <Button
              variant={filterPriority === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPriority("low")}
            >
              Low ({principles.filter(p => p.priority === 'low').length})
            </Button>
          </div>
        </div>
      </div>

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrinciples.map((principle) => {
            const stats = alignmentStats[principle.id] || { documents: 0, projects: 0, sops: 0, avgConfidence: 0 };
            const totalAligned = stats.documents + stats.projects + stats.sops;
            
            return (
              <Card key={principle.id} className="hover:shadow-card-hover transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      <Badge className={priorityColors[principle.priority]}>
                        {principle.priority}
                      </Badge>
                      <Badge variant={principle.type === 'core' ? 'default' : 'secondary'}>
                        {principle.type === 'core' ? '⭐ Core' : '🎯 Aspirational'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(principle)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(principle.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-2">{principle.title}</CardTitle>
                  {principle.description && (
                    <CardDescription className="line-clamp-2">
                      {principle.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {principle.content}
                    </p>
                    
                    {/* Alignment Stats */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Alignment</span>
                        <span className="font-semibold">{totalAligned} items</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span>{stats.documents} docs</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FolderOpen className="w-3 h-3" />
                          <span>{stats.projects} proj</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <BookOpen className="w-3 h-3" />
                          <span>{stats.sops} SOPs</span>
                        </div>
                      </div>

                      {stats.avgConfidence > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp className="w-3 h-3 text-primary" />
                          <span className="text-muted-foreground">
                            AI Confidence: {stats.avgConfidence}%
                          </span>
                          {stats.avgConfidence >= 80 ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : stats.avgConfidence >= 60 ? (
                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {principle.tags && principle.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {principle.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {principle.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{principle.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {principle.category && (
                      <div className="flex items-center gap-2 text-sm pt-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{principle.category}</span>
                      </div>
                    )}

                    <div className="pt-2 text-xs text-muted-foreground">
                      Updated {new Date(principle.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}