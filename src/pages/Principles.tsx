import { useState, useEffect } from "react";
import { Plus, Lightbulb, Edit, Trash2, Star, Layers } from "lucide-react";
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
  created_at: string;
  updated_at: string;
};

export default function Principles() {
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinciple, setEditingPrinciple] = useState<Principle | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "",
    priority: "medium" as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchPrinciples();
  }, []);

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
    });
    setEditingPrinciple(null);
  };

  const filteredPrinciples = filterPriority === "all" 
    ? principles 
    : principles.filter(p => p.priority === filterPriority);

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
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Leadership, Strategy"
                      />
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
        <div className="flex gap-2 mt-4">
          <Button
            variant={filterPriority === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterPriority("all")}
          >
            All ({principles.length})
          </Button>
          <Button
            variant={filterPriority === "high" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterPriority("high")}
          >
            High Priority ({principles.filter(p => p.priority === 'high').length})
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
          {filteredPrinciples.map((principle) => (
            <Card key={principle.id} className="hover:shadow-card-hover transition-smooth">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <Badge className={priorityColors[principle.priority]}>
                      {principle.priority}
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
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {principle.content}
                  </p>
                  
                  {principle.category && (
                    <div className="flex items-center gap-2 text-sm pt-2">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{principle.category}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t text-xs text-muted-foreground">
                    Updated {new Date(principle.updated_at).toLocaleDateString()}
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