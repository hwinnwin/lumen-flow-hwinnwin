import { 
  Calendar, 
  Target, 
  Lightbulb, 
  BookOpen, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  RefreshCw,
  ArrowRight,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDailyFocus, useGenerateDailyFocus, type TopAction } from "@/hooks/useDailyFocus";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: dailyFocus, isLoading, refetch } = useDailyFocus();
  const generateFocus = useGenerateDailyFocus();

  // Auto-generate if no focus exists for today
  useEffect(() => {
    if (!isLoading && !dailyFocus && !generateFocus.isPending) {
      generateFocus.mutate();
    }
  }, [isLoading, dailyFocus]);

  const isLoadingFocus = isLoading || generateFocus.isPending;

  if (isLoadingFocus) {
    return (
      <div className="space-y-6">
        <SimpleSkeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SimpleSkeleton className="h-64 w-full" />
          <SimpleSkeleton className="h-64 w-full" />
          <SimpleSkeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const focusTheme = dailyFocus?.focus_theme;
  const topActions = dailyFocus?.top_actions || [];
  const projectHealth = dailyFocus?.project_health || [];
  const insights = dailyFocus?.insights || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-500';
      case 'needs_attention': return 'text-yellow-500';
      case 'at_risk': return 'text-orange-500';
      case 'blocked': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle2 className="w-4 h-4" />;
      case 'needs_attention': return <AlertCircle className="w-4 h-4" />;
      case 'at_risk': return <AlertCircle className="w-4 h-4" />;
      case 'blocked': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Your Focus Today
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered priority intelligence based on your principles
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateFocus.mutate()}
            disabled={generateFocus.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generateFocus.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Hero Section: Today's Focus Theme */}
      {focusTheme && (
        <Card className="bg-gradient-primary border-primary/20 shadow-elegant">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-primary-foreground mb-2">
                  🎯 {focusTheme.title}
                </h2>
                <p className="text-primary-foreground/90 text-lg leading-relaxed">
                  {focusTheme.description}
                </p>
              </div>
              <div className="ml-6 text-right">
                <div className="text-4xl font-bold text-primary-foreground mb-1">
                  {focusTheme.priority_score}
                  <span className="text-lg">/100</span>
                </div>
                <div className="text-sm text-primary-foreground/80">Priority Score</div>
                <Progress 
                  value={focusTheme.priority_score} 
                  className="w-24 mt-2 h-2 bg-primary-foreground/20"
                />
              </div>
            </div>
            {focusTheme.aligned_principles && focusTheme.aligned_principles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-4">
                <span className="text-sm text-primary-foreground/80">Aligned Principles:</span>
                {focusTheme.aligned_principles.map((principle, i) => (
                  <Badge key={i} variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                    ✓ {principle}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top 3 Priority Actions */}
      {topActions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            What Matters Most
          </h2>
          <div className="space-y-4">
            {topActions.slice(0, 3).map((action: TopAction, index: number) => (
              <Card key={index} className="bg-card border-border shadow-card hover:shadow-elegant transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={getPriorityColor(action.priority)}>
                          {action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢'} {action.priority.toUpperCase()}
                        </Badge>
                        <h3 className="text-lg font-semibold text-foreground">
                          {action.title}
                        </h3>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Why: </span>
                          <span className="text-sm text-foreground">{action.why}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Impact: </span>
                          <span className="text-sm text-foreground">{action.impact}</span>
                        </div>
                      </div>

                      {(action.related_docs?.length || action.related_sops?.length) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                          <BookOpen className="w-3 h-3" />
                          <span>
                            Related resources: {action.related_docs?.length || 0} docs, {action.related_sops?.length || 0} SOPs
                          </span>
                        </div>
                      )}
                    </div>

                    <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                      {action.quick_action}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Health */}
        {projectHealth.length > 0 && (
          <Card className="bg-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Project Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectHealth.map((project, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={getStatusColor(project.status)}>
                            {getStatusIcon(project.status)}
                          </span>
                          <h4 className="font-semibold text-foreground">{project.project_name}</h4>
                        </div>
                        <Badge className="text-xs" variant="outline">
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{project.health_score}%</div>
                        <div className="text-xs text-muted-foreground">Health</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Next: </span>
                        <span className="text-foreground">{project.next_milestone}</span>
                      </div>
                      {project.blocking_issue && (
                        <Alert className="border-yellow-500/20 bg-yellow-500/5">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-400">
                            {project.blocking_issue}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">AI Suggests: </span>
                        <span className="text-xs text-foreground">{project.ai_recommendation}</span>
                      </div>
                      <Progress value={project.principle_alignment} className="h-1" />
                      <div className="text-xs text-muted-foreground">
                        {project.principle_alignment}% principle alignment
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Knowledge Insights */}
        {insights.length > 0 && (
          <Card className="bg-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary-glow" />
                Knowledge Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="p-4 rounded-lg bg-gradient-subtle border border-border">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {insight.type === 'pattern' && '📊'}
                        {insight.type === 'risk' && '⚠️'}
                        {insight.type === 'opportunity' && '💡'}
                        {insight.type === 'connection' && '🔗'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        <div className="text-xs text-primary font-medium">
                          → {insight.action}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversation Starters */}
      <Card className="bg-gradient-subtle border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Ask Lumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "What's blocking my highest priority project?",
              "Show me documents related to today's focus",
              "Help me plan next week's priorities",
              "Analyze my workflow efficiency",
            ].map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => navigate('/assistant')}
              >
                <span className="text-sm">{question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!dailyFocus && !isLoadingFocus && (
        <Alert>
          <Sparkles className="w-4 h-4" />
          <AlertDescription>
            No daily focus generated yet. Click the Refresh button to generate your personalized daily plan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
