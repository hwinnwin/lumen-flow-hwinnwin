import { useState, useEffect } from "react";
import { Inbox as InboxIcon, Clock, Tag, CheckCircle, Edit, Trash2, Plus, Info, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/appConfig";
import { supabase } from "@/integrations/supabase/client";
import { AddSourceDialog } from "@/components/inbox/AddSourceDialog";
import { chakraCategories } from "@/lib/chakraSystem";

const mockItems = [
  {
    id: 1,
    type: "task",
    title: "Review and approve marketing campaign",
    content: "The marketing team needs approval for the Q1 campaign focusing on enterprise clients. Budget allocated: $50k",
    tags: ["marketing", "approval", "Q1"],
    confidence: 0.95,
    parsed_at: "2 mins ago",
    status: "pending",
    chakra_category: "solar_plexus" as const,
    priority: "high"
  },
  {
    id: 2,
    type: "framework",
    title: "SCRUM Sprint Planning Framework",
    content: "Agile framework for managing product development through iterative sprints with defined roles and ceremonies",
    tags: ["agile", "scrum", "management"],
    confidence: 0.87,
    parsed_at: "1 hour ago",
    status: "pending",
    chakra_category: "crown" as const,
    priority: "medium"
  },
  {
    id: 3,
    type: "insight",
    title: "Customer retention patterns analysis",
    content: "Analysis shows 73% retention rate correlates with onboarding completion within first 7 days",
    tags: ["analytics", "retention", "onboarding"],
    confidence: 0.92,
    parsed_at: "3 hours ago",
    status: "pending",
    chakra_category: "third_eye" as const,
    priority: "medium"
  },
  {
    id: 4,
    type: "script",
    title: "Weekly progress automation script",
    content: "Automated script to compile weekly progress reports from project management tools and send to stakeholders",
    tags: ["automation", "reporting", "weekly"],
    confidence: 0.89,
    parsed_at: "1 day ago",
    status: "pending",
    chakra_category: "sacral" as const,
    priority: "low"
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
  const [syncing, setSyncing] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);

  useEffect(() => {
    if (!APP_CONFIG.demoMode) {
      fetchInboxItems();
    }
  }, []);

  const fetchInboxItems = async () => {
    try {
      setLoading(true);
      
      // Fetch emails and their parsed AI content
      const { data: emails, error } = await supabase
        .from('emails')
        .select(`
          *,
          ai_chats (
            id,
            title,
            content,
            chakra_category,
            tags,
            priority,
            status
          )
        `)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform to inbox items format
      const inboxItems = emails?.map((email: any) => {
        const aiChat = email.ai_chats?.[0];
        
        return {
          id: email.id,
          type: aiChat ? determineType(aiChat.tags) : "email",
          title: aiChat?.title || email.subject || '(No Subject)',
          content: aiChat?.content || email.snippet || '',
          tags: aiChat?.tags || [],
          confidence: aiChat ? 0.85 : 0,
          parsed_at: email.created_at,
          status: aiChat?.status || 'unparsed',
          chakra_category: aiChat?.chakra_category,
          priority: aiChat?.priority,
          sender: email.sender,
          received_at: email.received_at,
        };
      }) || [];

      setItems(inboxItems);
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

  const handleSyncEmails = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-emails');
      
      if (error) throw error;
      
      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} new emails`,
      });
      
      // Refresh the inbox
      await fetchInboxItems();
    } catch (error) {
      console.error('Error syncing emails:', error);
      toast({
        title: "Sync Failed",
        description: "Unable to sync emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const determineType = (tags: string[]) => {
    if (tags.includes('task')) return 'task';
    if (tags.includes('framework')) return 'framework';
    if (tags.includes('insight')) return 'insight';
    if (tags.includes('script')) return 'script';
    return 'email';
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
        <div className="flex gap-2">
          {!APP_CONFIG.demoMode && (
            <Button 
              variant="outline"
              onClick={handleSyncEmails}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
          <Button 
            className="bg-gradient-primary text-primary-foreground shadow-royal"
            onClick={() => setShowAddSource(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>
      
      <AddSourceDialog open={showAddSource} onOpenChange={setShowAddSource} />

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
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {APP_CONFIG.demoMode && (
                      <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                        SAMPLE
                      </Badge>
                    )}
                    {item.status === 'unparsed' && (
                      <Badge variant="outline" className="border-orange-500/50 text-orange-500 bg-orange-500/10">
                        Unparsed Email
                      </Badge>
                    )}
                    <Badge className={typeColors[item.type as keyof typeof typeColors]}>
                      {item.type}
                    </Badge>
                    {item.chakra_category && (
                      <div 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs"
                        style={{
                          borderColor: chakraCategories[item.chakra_category].color,
                          backgroundColor: `${chakraCategories[item.chakra_category].color.replace(')', ' / 0.1)')}`
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: chakraCategories[item.chakra_category].color }}
                        />
                        <span style={{ color: chakraCategories[item.chakra_category].color }}>
                          {chakraCategories[item.chakra_category].label}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {item.parsed_at ? new Date(item.parsed_at).toLocaleString() : 'Just now'}
                    </div>
                    {item.confidence > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Confidence: {Math.round(item.confidence * 100)}%
                      </div>
                    )}
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