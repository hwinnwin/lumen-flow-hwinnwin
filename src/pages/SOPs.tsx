import { useState, useEffect } from "react";
import { Plus, BookOpen, Edit, Trash2, FileText, Tag, Archive } from "lucide-react";
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

type SOP = {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
  version: string;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
};

export default function SOPs() {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "",
    tags: "",
    version: "1.0",
    status: "active" as 'active' | 'draft' | 'archived',
  });

  useEffect(() => {
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view SOPs",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSOPs((data as SOP[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching SOPs",
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

      const sopData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        user_id: user.id,
      };

      if (editingSOP) {
        const { error } = await supabase
          .from('sops')
          .update(sopData)
          .eq('id', editingSOP.id);

        if (error) throw error;
        
        toast({
          title: "SOP updated",
          description: "Standard Operating Procedure has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('sops')
          .insert([sopData]);

        if (error) throw error;
        
        toast({
          title: "SOP created",
          description: "Standard Operating Procedure has been created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchSOPs();
    } catch (error: any) {
      toast({
        title: "Error saving SOP",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sop: SOP) => {
    setEditingSOP(sop);
    setFormData({
      title: sop.title,
      description: sop.description || "",
      content: sop.content,
      category: sop.category || "",
      tags: sop.tags?.join(', ') || "",
      version: sop.version,
      status: sop.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SOP?")) return;

    try {
      const { error } = await supabase
        .from('sops')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "SOP deleted",
        description: "Standard Operating Procedure has been deleted",
      });
      
      fetchSOPs();
    } catch (error: any) {
      toast({
        title: "Error deleting SOP",
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
      tags: "",
      version: "1.0",
      status: "active",
    });
    setEditingSOP(null);
  };

  const filteredSOPs = filterStatus === "all" 
    ? sops 
    : sops.filter(sop => sop.status === filterStatus);

  const statusColors = {
    active: "bg-green-500/20 text-green-700 dark:text-green-300",
    draft: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    archived: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
                Standard Operating Procedures
              </h1>
              <p className="text-muted-foreground">Manage your processes and workflows</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-royal hover:shadow-glow transition-royal">
                <Plus className="w-4 h-4 mr-2" />
                New SOP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingSOP ? "Edit SOP" : "Create New SOP"}</DialogTitle>
                  <DialogDescription>
                    Define a standard operating procedure for your team
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
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      rows={10}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="process, onboarding, sales"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'draft' | 'archived') => 
                        setFormData({ ...formData, status: value })
                      }
                    >
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
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-primary">
                    {editingSOP ? "Update" : "Create"} SOP
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All ({sops.length})
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("active")}
          >
            Active ({sops.filter(s => s.status === 'active').length})
          </Button>
          <Button
            variant={filterStatus === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("draft")}
          >
            Draft ({sops.filter(s => s.status === 'draft').length})
          </Button>
          <Button
            variant={filterStatus === "archived" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("archived")}
          >
            Archived ({sops.filter(s => s.status === 'archived').length})
          </Button>
        </div>
      </div>

      {/* SOPs Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading SOPs...</p>
        </div>
      ) : filteredSOPs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SOPs yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first Standard Operating Procedure to get started
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create SOP
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSOPs.map((sop) => (
            <Card key={sop.id} className="hover:shadow-card-hover transition-smooth">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <Badge className={statusColors[sop.status]}>
                      {sop.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(sop)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(sop.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{sop.title}</CardTitle>
                {sop.description && (
                  <CardDescription className="line-clamp-2">
                    {sop.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sop.category && (
                    <div className="flex items-center gap-2 text-sm">
                      <Archive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{sop.category}</span>
                    </div>
                  )}
                  
                  {sop.tags && sop.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sop.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t text-xs text-muted-foreground">
                    Version {sop.version} • Updated {new Date(sop.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}