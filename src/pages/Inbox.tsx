import { useState, useEffect } from "react";
import { Inbox as InboxIcon, Clock, Tag, CheckCircle, Edit, Trash2, Plus, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/appConfig";
import { supabase } from "@/integrations/supabase/client";

const mockItems = [
  {
    id: 1,
    type: "task",
    title: "Review and approve marketing campaign",
    content: "The marketing team needs approval for the Q1 campaign focusing on enterprise clients. Budget allocated: $50k",
    tags: ["marketing", "approval", "Q1"],
    confidence: 0.95,
    parsed_at: "2 mins ago",
    status: "pending"
  },
  {
    id: 2,
    type: "framework",
    title: "SCRUM Sprint Planning Framework",
    content: "Agile framework for managing product development through iterative sprints with defined roles and ceremonies",
    tags: ["agile", "scrum", "management"],
    confidence: 0.87,
    parsed_at: "1 hour ago",
    status: "pending"
  },
  {
    id: 3,
    type: "insight",
    title: "Customer retention patterns analysis",
    content: "Analysis shows 73% retention rate correlates with onboarding completion within first 7 days",
    tags: ["analytics", "retention", "onboarding"],
    confidence: 0.92,
    parsed_at: "3 hours ago",
    status: "pending"
  },
  {
    id: 4,
    type: "script",
    title: "Weekly progress automation script",
    content: "Automated script to compile weekly progress reports from project management tools and send to stakeholders",
    tags: ["automation", "reporting", "weekly"],
    confidence: 0.89,
    parsed_at: "1 day ago",
    status: "pending"
  }
];

const typeColors = {
  task: "bg-blue-500/10 text-blue-500",
  framework: "bg-purple-500/10 text-purple-500",
  insight: "bg-green-500/10 text-green-500",
  script: "bg-orange-500/10 text-orange-500"
};

export default function Inbox() {
  const [items, setItems] = useState(APP_CONFIG.demoMode ? mockItems : []);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [loading, setLoading] = useState(!APP_CONFIG.demoMode);

  useEffect(() => {
    if (!APP_CONFIG.demoMode) {
      fetchInboxItems();
    }
  }, []);

  const fetchInboxItems = async () => {
    try {
      setLoading(true);
      // TODO: Fetch from inbox_items table when it's created in Supabase
      // For now, return empty array in production mode
      // const { data, error } = await supabase
      //   .from('inbox_items')
      //   .select('*')
      //   .eq('status', 'pending')
      //   .order('created_at', { ascending: false });
      // if (error) throw error;
      // if (data) setItems(data);
      
      setItems([]);
    } catch (error) {
      console.error('Error fetching inbox items:', error);
      toast({
        title: "Error loading items",
        description: "Could not fetch inbox items from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    toast({
      title: "Item approved",
      description: "The item has been added to your collection.",
    });
  };

  const handleReject = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    toast({
      title: "Item rejected",
      description: "The item has been removed.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {APP_CONFIG.demoMode && (
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-foreground">
            <strong>Demo Mode:</strong> These are sample items to demonstrate the AI inbox workflow. 
            In production, items will be automatically parsed from your connected email sources (Gmail/Outlook) 
            and categorized as Tasks, Frameworks, Insights, or Scripts for your review.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
            Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-parsed items from your sources
          </p>
        </div>
        <Button 
          className="bg-gradient-primary text-primary-foreground shadow-royal"
          onClick={() => toast({
            title: "Add Source",
            description: "Source management coming soon with backend integration.",
          })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{items.length}</p>
                <p className="text-sm text-muted-foreground">Pending Items</p>
              </div>
              <InboxIcon className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {items.filter(item => item.type === 'task').length}
                </p>
                <p className="text-sm text-muted-foreground">Tasks</p>
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
                <p className="text-2xl font-bold text-foreground">
                  {items.filter(item => item.type === 'framework').length}
                </p>
                <p className="text-sm text-muted-foreground">Frameworks</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {items.filter(item => item.type === 'insight').length}
                </p>
                <p className="text-sm text-muted-foreground">Insights</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {items.map((item) => (
          <Card 
            key={item.id} 
            className={`bg-card border-border shadow-card hover:shadow-glow transition-royal cursor-pointer ${
              selectedItem === item.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                      SAMPLE
                    </Badge>
                    <Badge className={typeColors[item.type as keyof typeof typeColors]}>
                      {item.type}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {item.parsed_at}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>

                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {item.content}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {selectedItem === item.id && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div>
                        <label className="text-sm font-medium text-foreground">Edit Title</label>
                        <Input 
                          defaultValue={item.title} 
                          className="mt-1 bg-input border-border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Edit Content</label>
                        <Textarea 
                          defaultValue={item.content} 
                          className="mt-1 min-h-[100px] bg-input border-border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Tags (comma-separated)</label>
                        <Input 
                          defaultValue={item.tags.join(', ')} 
                          className="mt-1 bg-input border-border"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(selectedItem === item.id ? null : item.id);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(item.id);
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(item.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="bg-card border-border shadow-card">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading inbox items...</p>
          </CardContent>
        </Card>
      ) : items.length === 0 && (
        <Card className="bg-card border-border shadow-card">
          <CardContent className="p-12 text-center">
            <InboxIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Inbox is empty</h3>
            <p className="text-muted-foreground">All items have been processed. Great work!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}