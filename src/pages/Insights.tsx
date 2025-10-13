import { useState } from "react";
import { Lightbulb, Search, Plus, Calendar, Tag, Edit, Trash2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useInsights, useCreateInsight, useUpdateInsight, useDeleteInsight } from "@/hooks/useInsights";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";

const categories = ["All", "Business", "Management", "Product", "Personal"];

export default function Insights() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newInsight, setNewInsight] = useState({ 
    title: "", 
    content: "", 
    category: "Personal", 
    tags: [] as string[],
    is_favorite: false 
  });

  const { data: insights = [], isLoading } = useInsights();
  const createInsight = useCreateInsight();
  const updateInsight = useUpdateInsight();
  const deleteInsight = useDeleteInsight();

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (insight.tags && insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = selectedCategory === "All" || insight.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    const insight = insights.find(i => i.id === id);
    if (insight) {
      updateInsight.mutate({ id, is_favorite: !insight.is_favorite });
    }
  };

  const handleDelete = (id: string) => {
    deleteInsight.mutate(id);
  };

  const handleCreate = () => {
    if (!newInsight.title || !newInsight.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }
    createInsight.mutate(newInsight);
    setNewInsight({ title: "", content: "", category: "Personal", tags: [], is_favorite: false });
    setIsCreating(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SimpleSkeleton className="h-32 w-full" />
        <SimpleSkeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
            Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personal knowledge journal and insight collection
          </p>
        </div>
        <Button 
          className="bg-gradient-primary text-primary-foreground shadow-royal"
          onClick={() => setIsCreating(!isCreating)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Insight
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-gradient-primary text-primary-foreground" : ""}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{insights.length}</p>
                <p className="text-sm text-muted-foreground">Total Insights</p>
              </div>
              <Lightbulb className="w-6 h-6 text-primary-glow" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.filter(i => i.is_favorite).length}
                </p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
              <Heart className="w-6 h-6 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{categories.length - 1}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <Tag className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.filter(i => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(i.created_at) > weekAgo;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
              <Calendar className="w-6 h-6 text-primary-glow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Insight Form */}
      {isCreating && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader>
            <CardTitle>Create New Insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title"
              value={newInsight.title}
              onChange={(e) => setNewInsight({ ...newInsight, title: e.target.value })}
            />
            <Textarea
              placeholder="Content"
              value={newInsight.content}
              onChange={(e) => setNewInsight({ ...newInsight, content: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Save Insight</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <Card className="bg-card border-border shadow-card">
            <CardContent className="p-12 text-center">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No insights found</h3>
              <p className="text-muted-foreground">Try adjusting your search or create your first insight</p>
            </CardContent>
          </Card>
        ) : (
          filteredInsights.map((insight) => (
            <Card key={insight.id} className="bg-card border-border shadow-card hover:shadow-glow transition-royal">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {insight.category && <Badge variant="secondary">{insight.category}</Badge>}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(insight.created_at)}
                      </div>
                      {insight.updated_at !== insight.created_at && (
                        <span className="text-xs text-muted-foreground">
                          (edited {formatDate(insight.updated_at)})
                        </span>
                      )}
                    </div>
                    
                    {editingId === insight.id ? (
                      <Input
                        defaultValue={insight.title}
                        onBlur={(e) => {
                          updateInsight.mutate({ id: insight.id, title: e.target.value });
                          setEditingId(null);
                        }}
                        className="text-xl font-semibold mb-2 bg-input border-border"
                        autoFocus
                      />
                    ) : (
                      <CardTitle className="text-xl text-foreground mb-2">
                        {insight.title}
                      </CardTitle>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(insight.id)}
                      className="p-2"
                    >
                      <Heart 
                        className={`w-4 h-4 ${
                          insight.is_favorite ? 'fill-accent text-accent' : 'text-muted-foreground'
                        }`} 
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(editingId === insight.id ? null : insight.id)}
                      className="p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(insight.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {editingId === insight.id ? (
                  <Textarea
                    defaultValue={insight.content}
                    onBlur={(e) => {
                      updateInsight.mutate({ id: insight.id, content: e.target.value });
                      setEditingId(null);
                    }}
                    className="min-h-[200px] mb-4 bg-input border-border"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none mb-4">
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {insight.content}
                    </p>
                  </div>
                )}
                
                {insight.tags && insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
