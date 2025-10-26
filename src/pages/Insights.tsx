import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Target,
  FileText,
  BookOpen,
  Calendar,
  Copy,
  Send,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

type DateRange = "7" | "14" | "30";

// Confidence color helper
function confidenceColor(score?: number) {
  if (!score) return "bg-gray-400";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function Insights() {
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const { toast } = useToast();

  const rangeInDays = parseInt(dateRange);
  const startDate = useMemo(() => subDays(new Date(), rangeInDays), [rangeInDays]);

  // Fetch all data
  const { data: documents = [] } = useQuery({
    queryKey: ["documents-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
  });

  const { data: principles = [] } = useQuery({
    queryKey: ["principles-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("principles")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .gte("created_at", startDate.toISOString());
      return data || [];
    },
  });

  const { data: sops = [] } = useQuery({
    queryKey: ["sops-insights"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("sops")
        .select("*")
        .eq("user_id", user.id);
      return data || [];
    },
  });

  // Compute KPIs
  const kpis = useMemo(() => {
    const prevStartDate = subDays(startDate, rangeInDays);
    
    const alignedDocs = documents.filter((d: any) => d.primary_principle_id || d.linked_principle_id).length;
    const alignmentPercent = documents.length > 0 ? Math.round((alignedDocs / documents.length) * 100) : 0;

    const completedTasks = tasks.filter(
      (t: any) => t.status === "completed" && new Date(t.updated_at) >= startDate
    ).length;
    const prevCompletedTasks = tasks.filter(
      (t: any) => t.status === "completed" && new Date(t.updated_at) >= prevStartDate && new Date(t.updated_at) < startDate
    ).length;

    const overdueTasks = tasks.filter(
      (t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
    ).length;

    const activeProjects = projects.filter((p: any) => p.status !== "completed" && p.status !== "archived").length;
    const atRiskProjects = projects.filter((p: any) => {
      if (p.status === "completed" || p.status === "archived") return false;
      const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
      const incompleteTasks = projectTasks.filter((t: any) => t.status !== "completed").length;
      const avgConfidence = projectTasks.length > 0 
        ? projectTasks.reduce((sum: number, t: any) => sum + (t.confidence || 0), 0) / projectTasks.length
        : 100;
      const isNearDeadline = p.deadline && new Date(p.deadline) < subDays(new Date(), -7);
      return (isNearDeadline && incompleteTasks > 3) || avgConfidence < 60;
    }).length;

    return { 
      alignmentPercent, 
      completedTasks, 
      completedDelta: prevCompletedTasks > 0 ? Math.round(((completedTasks - prevCompletedTasks) / prevCompletedTasks) * 100) : 0,
      overdueTasks, 
      activeProjects, 
      atRiskProjects 
    };
  }, [documents, tasks, projects, startDate, rangeInDays]);

  // Principle Alignment Over Time
  const alignmentOverTime = useMemo(() => {
    const weeks = Math.ceil(rangeInDays / 7);
    const data = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = subDays(new Date(), (weeks - i) * 7);
      const weekEnd = subDays(new Date(), (weeks - i - 1) * 7);
      const weekDocs = documents.filter((d: any) => {
        const created = new Date(d.created_at);
        return created >= weekStart && created <= weekEnd;
      });
      const alignedCount = weekDocs.filter((d: any) => d.primary_principle_id || d.linked_principle_id).length;
      const overrideCount = weekDocs.filter((d: any) => d.user_override).length;
      data.push({
        week: `Week ${i + 1}`,
        alignment: weekDocs.length > 0 ? Math.round((alignedCount / weekDocs.length) * 100) : 0,
        overrides: overrideCount,
      });
    }
    return data;
  }, [documents, rangeInDays]);

  // Productivity Patterns
  const productivityPatterns = useMemo(() => {
    const byWeekday = Array(7).fill(0).map(() => ({ manual: 0, assistant: 0, daily_focus: 0 }));
    const cycleTimes: number[] = [];
    
    tasks.filter((t: any) => t.status === "completed" && new Date(t.updated_at) >= startDate).forEach((t: any) => {
      const day = new Date(t.completed_at || t.updated_at).getDay();
      const source = (t as any).source || "manual";
      if (source in byWeekday[day]) byWeekday[day][source as keyof typeof byWeekday[0]]++;
      
      if (t.completed_at && t.created_at) {
        const cycleMs = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime();
        cycleTimes.push(cycleMs / (1000 * 60 * 60)); // hours
      }
    });

    const weekdayData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => ({
      day,
      Manual: byWeekday[i].manual,
      Assistant: byWeekday[i].assistant,
      "Daily Focus": byWeekday[i].daily_focus,
    }));

    cycleTimes.sort((a, b) => a - b);
    const medianCycle = cycleTimes.length > 0 ? cycleTimes[Math.floor(cycleTimes.length / 2)] : 0;

    return { weekdayData, medianCycle };
  }, [tasks, startDate]);

  // Project Health
  const projectHealth = useMemo(() => {
    return projects
      .filter((p: any) => p.status !== "completed" && p.status !== "archived")
      .map((p: any) => {
        const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
        const completed = projectTasks.filter((t: any) => t.status === "completed").length;
        const total = projectTasks.length;
        const throughput = projectTasks.filter(
          (t: any) => t.status === "completed" && new Date(t.completed_at || t.updated_at) >= subDays(new Date(), 14)
        ).length;
        
        const projectDocs = documents.filter((d: any) => d.linked_project_id === p.id);
        const avgConfidence =
          projectDocs.length > 0
            ? Math.round(
                projectDocs.reduce((sum: number, d: any) => sum + (d.principle_alignment_score || 0), 0) /
                  projectDocs.length
              )
            : 0;

        const daysToDeadline = p.deadline
          ? Math.ceil((new Date(p.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const atRisk =
          (daysToDeadline !== null && daysToDeadline < 7 && total - completed > 3) || avgConfidence < 60;

        return {
          id: p.id,
          name: p.name,
          daysToDeadline,
          throughput,
          avgConfidence,
          atRisk,
        };
      });
  }, [projects, tasks, documents]);

  // Knowledge Gaps
  const knowledgeGaps = useMemo(() => {
    const principleGaps = principles.map((p: any) => {
      const docCount = documents.filter((d: any) => d.primary_principle_id === p.id || d.linked_principle_id === p.id)
        .length;
      return { principle: p.title, docCount };
    });

    const projectGaps = projects
      .filter((p: any) => p.status !== "completed" && p.status !== "archived")
      .map((p: any) => {
        const sopCount = sops.filter((s: any) => s.project_id === p.id).length;
        const docCount = documents.filter((d: any) => d.linked_project_id === p.id).length;
        return { project: p.name, sopCount, docCount };
      });

    const unalignedDocs = documents.filter((d: any) => !d.primary_principle_id && !d.linked_principle_id).length;

    return { principleGaps, projectGaps, unalignedDocs };
  }, [principles, projects, documents, sops]);

  // Weekly Summary
  const weeklySummary = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    
    const weekDocs = documents.filter((d: any) =>
      isWithinInterval(new Date(d.created_at), { start: weekStart, end: weekEnd })
    );
    
    const weekTasks = tasks.filter(
      (t: any) =>
        t.status === "completed" &&
        isWithinInterval(new Date(t.completed_at || t.updated_at), { start: weekStart, end: weekEnd })
    );

    const topDoc = weekDocs.sort((a: any, b: any) => (b.principle_alignment_score || 0) - (a.principle_alignment_score || 0))[0];
    const overrides = weekDocs.filter((d: any) => d.user_override).length;

    return `This week, you completed ${weekTasks.length} tasks${
      topDoc ? ` and aligned "${topDoc.title}" with confidence ${topDoc.principle_alignment_score}%` : ""
    }. ${
      overrides > 0 ? `You made ${overrides} manual alignment corrections, showing refined judgment.` : "Great alignment consistency!"
    }`;
  }, [documents, tasks]);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(weeklySummary);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-subtle space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Smart Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Analytics across principles, projects, and productivity
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[200px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="14">Last 14 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.alignmentPercent}%</div>
                  <div className="text-xs text-muted-foreground">Alignment</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.completedTasks}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    Tasks Done
                    {kpis.completedDelta !== 0 && (
                      <span className={kpis.completedDelta > 0 ? "text-green-500" : "text-red-500"}>
                        {kpis.completedDelta > 0 ? "+" : ""}{kpis.completedDelta}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.overdueTasks}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.activeProjects}</div>
                  <div className="text-xs text-muted-foreground">Active Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{kpis.atRiskProjects}</div>
                  <div className="text-xs text-muted-foreground">At Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Principle Alignment Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Principle Alignment Over Time
            </CardTitle>
            <CardDescription className="text-xs">
              % of documents aligned to principles per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={alignmentOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="alignment" stroke="hsl(var(--primary))" strokeWidth={2} name="Alignment %" />
                <Line type="monotone" dataKey="overrides" stroke="hsl(var(--destructive))" strokeWidth={2} name="Overrides" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Productivity Patterns
            </CardTitle>
            <CardDescription className="text-xs">
              Tasks by weekday and source • Median cycle: {productivityPatterns.medianCycle.toFixed(1)}h
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={productivityPatterns.weekdayData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Manual" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="Assistant" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar dataKey="Daily Focus" stackId="a" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project Health */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Project Health
          </CardTitle>
          <CardDescription className="text-xs">
            Active projects with risk indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Throughput</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectHealth.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No active projects
                  </TableCell>
                </TableRow>
              ) : (
                projectHealth.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.daysToDeadline !== null ? (
                        <span className={p.daysToDeadline < 7 ? "text-red-500" : ""}>
                          {p.daysToDeadline}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{p.throughput} last 14d</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${confidenceColor(p.avgConfidence)}`} />
                        {p.avgConfidence}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.atRisk && (
                        <Badge variant="destructive" className="text-xs">At Risk</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Knowledge Gaps */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Knowledge Gaps
          </CardTitle>
          <CardDescription className="text-xs">
            Areas needing documentation or alignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Principles with Low Doc Support</h4>
            {knowledgeGaps.principleGaps.slice(0, 5).map((pg) => (
              <div key={pg.principle} className="flex items-center justify-between py-1">
                <span className="text-sm">{pg.principle}</span>
                <Badge variant="outline" className="text-xs">{pg.docCount} docs</Badge>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Projects Missing SOPs</h4>
            {knowledgeGaps.projectGaps.filter((pg) => pg.sopCount === 0).slice(0, 5).map((pg) => (
              <div key={pg.project} className="flex items-center justify-between py-1">
                <span className="text-sm">{pg.project}</span>
                <Badge variant="outline" className="text-xs">{pg.docCount} docs</Badge>
              </div>
            ))}
          </div>
          {knowledgeGaps.unalignedDocs > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>{knowledgeGaps.unalignedDocs}</strong> documents without principle alignment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What I Learned This Week */}
      <Card className="rounded-2xl shadow-sm bg-gradient-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            What I Learned This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed mb-4">{weeklySummary}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopySummary}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
