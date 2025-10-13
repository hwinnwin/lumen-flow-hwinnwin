import { Calendar, Clock, Target, Lightbulb, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";
import { chakraCategories, type ChakraCategory } from "@/lib/chakraSystem";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true })
        .limit(3);
      return data || [];
    },
  });

  const { data: principles = [], isLoading: principlesLoading } = useQuery({
    queryKey: ["dashboard-principles"],
    queryFn: async () => {
      const { data } = await supabase.from("principles").select("*").limit(3);
      return data || [];
    },
  });

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: sops = [], isLoading: sopsLoading } = useQuery({
    queryKey: ["dashboard-sops"],
    queryFn: async () => {
      const { data } = await supabase.from("sops").select("*").limit(3);
      return data || [];
    },
  });

  const isLoading = tasksLoading || principlesLoading || insightsLoading || sopsLoading;

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
            Good morning, Flow Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your daily digest to conquer the day
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{principles.length}</p>
                <p className="text-sm text-muted-foreground">Principles</p>
              </div>
              <BookOpen className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{insights.length}</p>
                <p className="text-sm text-muted-foreground">Insights</p>
              </div>
              <Lightbulb className="w-8 h-8 text-primary-glow" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{sops.length}</p>
                <p className="text-sm text-muted-foreground">SOPs</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tasks yet. Create one in Workflow!</p>
                  <Button 
                    className="mt-4" 
                    size="sm"
                    onClick={() => navigate('/workflow')}
                  >
                    Go to Workflow
                  </Button>
                </div>
              ) : (
                <>
                  {tasks.map((task) => (
                    <div key={task.id} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-smooth">
                      <p className="font-medium text-foreground mb-2">{task.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.priority && (
                          <Badge 
                            className={
                              task.priority === 'high' 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20 text-xs' 
                                : task.priority === 'medium' 
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs' 
                                : 'bg-green-500/10 text-green-500 border-green-500/20 text-xs'
                            }
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button 
                    className="w-full mt-4 bg-gradient-primary text-primary-foreground" 
                    size="sm"
                    onClick={() => navigate('/workflow')}
                  >
                    View All Tasks
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Principles */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              Recent Principles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {principles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No principles yet. Add one!</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    size="sm"
                    onClick={() => navigate('/principles')}
                  >
                    Go to Principles
                  </Button>
                </div>
              ) : (
                <>
                  {principles.map((principle) => (
                    <div key={principle.id} className="p-4 rounded-lg bg-gradient-subtle border border-border">
                      <h3 className="font-semibold text-foreground mb-2">{principle.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{principle.content}</p>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => navigate('/principles')}
                  >
                    View All Principles
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Insights */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary-glow" />
              Recent Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No insights yet. Create one!</p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    size="sm"
                    onClick={() => navigate('/insights')}
                  >
                    Go to Insights
                  </Button>
                </div>
              ) : (
                <>
                  {insights.map((insight) => (
                    <div key={insight.id} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-smooth">
                      <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.content}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full mt-4" 
                    size="sm"
                    onClick={() => navigate('/insights')}
                  >
                    View All Insights
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
