import { Calendar, Clock, Target, Lightbulb, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const mockTasks = [
  { id: 1, title: "Review Q4 Strategy Document", due: "Today", priority: "high" },
  { id: 2, title: "Prepare Client Presentation", due: "Tomorrow", priority: "medium" },
  { id: 3, title: "Update Team Dashboard", due: "This Week", priority: "low" },
];

const mockFramework = {
  title: "Getting Things Done (GTD)",
  description: "Productivity methodology focusing on moving planned tasks out of the mind",
  tags: ["productivity", "methodology"]
};

const mockInsights = [
  { id: 1, title: "Customer feedback patterns", content: "Noticed 3 recurring themes in support tickets...", time: "2h ago" },
  { id: 2, title: "Market research notes", content: "Key insights from competitor analysis meeting...", time: "1d ago" },
  { id: 3, title: "Innovation opportunities", content: "Potential areas for product enhancement...", time: "2d ago" },
];

export default function Dashboard() {
  const navigate = useNavigate();

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
                <p className="text-2xl font-bold text-foreground">12</p>
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
                <p className="text-2xl font-bold text-foreground">8</p>
                <p className="text-sm text-muted-foreground">Frameworks</p>
              </div>
              <BookOpen className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">24</p>
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
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-sm text-muted-foreground">Weekly Goal</p>
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
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-smooth">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{task.due}</span>
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              className="w-full mt-4 bg-gradient-primary text-primary-foreground" 
              size="sm"
              onClick={() => navigate('/workflow')}
            >
              View All Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Featured Framework */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              Framework Spotlight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-subtle border border-border">
                <h3 className="font-semibold text-foreground mb-2">{mockFramework.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{mockFramework.description}</p>
                <div className="flex flex-wrap gap-1">
                  {mockFramework.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              size="sm"
              onClick={() => navigate('/codex')}
            >
              Explore Codex
            </Button>
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
              {mockInsights.map((insight) => (
                <div key={insight.id} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-smooth">
                  <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.content}</p>
                  <span className="text-xs text-muted-foreground">{insight.time}</span>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              size="sm"
              onClick={() => navigate('/insights')}
            >
              View All Insights
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}