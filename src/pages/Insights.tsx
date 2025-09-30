import { useState } from "react";
import { Lightbulb, Search, Plus, Calendar, Tag, Edit, Trash2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const mockInsights = [
  {
    id: 1,
    title: "Customer retention patterns analysis",
    content: "After analyzing 6 months of customer data, I've discovered that customers who complete our onboarding process within the first 7 days have a 73% higher retention rate. This suggests we need to focus on improving the initial user experience and perhaps implement progressive onboarding with clear milestones.\n\nKey findings:\n- Day 1-3: Email engagement is critical\n- Day 4-7: Feature adoption makes or breaks retention\n- Post-week 1: Success metrics correlate with long-term value",
    tags: ["analytics", "retention", "onboarding", "customer-success"],
    createdAt: "2024-01-10T14:30:00Z",
    updatedAt: "2024-01-11T09:15:00Z",
    isFavorite: true,
    category: "Business"
  },
  {
    id: 2,
    title: "Remote team collaboration insights",
    content: "Observations from managing a distributed team across 4 time zones. Asynchronous communication is key, but we're losing the spontaneous creativity that comes from hallway conversations.\n\nWhat's working:\n- Detailed async updates in Slack\n- Recorded video standups for context\n- Shared documentation culture\n\nWhat needs improvement:\n- Cross-timezone brainstorming sessions\n- Informal relationship building\n- Knowledge sharing between senior and junior developers",
    tags: ["remote-work", "team-management", "collaboration", "culture"],
    createdAt: "2024-01-09T16:45:00Z",
    updatedAt: "2024-01-09T16:45:00Z",
    isFavorite: false,
    category: "Management"
  },
  {
    id: 3,
    title: "Innovation opportunities in AI integration",
    content: "Potential areas where AI could enhance our product offering based on customer feedback and market research.\n\n1. Intelligent content categorization - customers spend too much time organizing\n2. Predictive workflow suggestions - learn from user patterns\n3. Automated progress reporting - reduce manual administrative work\n4. Smart notification timing - avoid overwhelming users\n\nNext steps: Prototype the content categorization feature first, as it has the highest impact-to-effort ratio.",
    tags: ["ai", "innovation", "product-development", "automation"],
    createdAt: "2024-01-08T11:20:00Z",
    updatedAt: "2024-01-10T13:30:00Z",
    isFavorite: true,
    category: "Product"
  },
  {
    id: 4,
    title: "Personal productivity reflections",
    content: "Monthly review of my productivity systems and what's working vs. what isn't.\n\nSuccesses this month:\n- Morning routine consistency (21/30 days)\n- Deep work blocks protected (4 hours daily average)\n- Weekly planning sessions kept me focused\n\nChallenges:\n- Email still interrupts flow state\n- Meeting-heavy weeks disrupt momentum\n- Context switching between projects\n\nAdjustments for next month:\n- Email batch processing (3x daily)\n- Block 2-hour minimum for deep work\n- Limit concurrent projects to 3 max",
    tags: ["productivity", "self-improvement", "habits", "reflection"],
    createdAt: "2024-01-07T20:00:00Z",
    updatedAt: "2024-01-07T20:00:00Z",
    isFavorite: false,
    category: "Personal"
  }
];

const categories = ["All", "Business", "Management", "Product", "Personal"];

export default function Insights() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [insights, setInsights] = useState(mockInsights);
  const [editingId, setEditingId] = useState<number | null>(null);

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || insight.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: number) => {
    const insight = insights.find(i => i.id === id);
    setInsights(insights.map(i => 
      i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
    ));
    toast({
      title: insight?.isFavorite ? "Removed from favorites" : "Added to favorites",
      description: insight?.title,
    });
  };

  const handleDelete = (id: number) => {
    const insight = insights.find(i => i.id === id);
    setInsights(insights.filter(i => i.id !== id));
    toast({
      title: "Insight deleted",
      description: insight?.title,
      variant: "destructive",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          onClick={() => toast({
            title: "New Insight",
            description: "Insight creation coming soon with backend integration.",
          })}
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
                  {insights.filter(i => i.isFavorite).length}
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
                    return new Date(i.createdAt) > weekAgo;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
              <Calendar className="w-6 h-6 text-primary-glow" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="bg-card border-border shadow-card hover:shadow-glow transition-royal">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{insight.category}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(insight.createdAt)}
                    </div>
                    {insight.updatedAt !== insight.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        (edited {formatDate(insight.updatedAt)})
                      </span>
                    )}
                  </div>
                  
                  {editingId === insight.id ? (
                    <Input
                      defaultValue={insight.title}
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
                        insight.isFavorite ? 'fill-accent text-accent' : 'text-muted-foreground'
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
                  className="min-h-[200px] mb-4 bg-input border-border"
                />
              ) : (
                <div className="prose prose-sm max-w-none mb-4">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {insight.content}
                  </p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {insight.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              
              {editingId === insight.id && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary text-primary-foreground"
                    onClick={() => {
                      setEditingId(null);
                      toast({
                        title: "Changes saved",
                        description: "Your insight has been updated.",
                      });
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <Card className="bg-card border-border shadow-card">
          <CardContent className="p-12 text-center">
            <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No insights found</h3>
            <p className="text-muted-foreground">Try adjusting your search or create your first insight</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}