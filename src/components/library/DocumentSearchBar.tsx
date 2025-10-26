import { Search, Filter, Calendar, Tag, FolderOpen, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentSearchBarProps {
  query: string;
  category: string;
  principleId: string;
  projectId: string;
  tags: string[];
  dateRange: string;
  sortBy: string;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPrincipleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
  onDateRangeChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

const categories = ["All", "SOP", "Principle", "Project Note", "General Reference"];
const dateRanges = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "updated", label: "Last Updated" },
  { value: "created", label: "Created Date" },
  { value: "title", label: "Title A-Z" },
];

export function DocumentSearchBar(props: DocumentSearchBarProps) {
  const [principles, setPrinciples] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [principlesRes, projectsRes, docsRes] = await Promise.all([
        supabase.from('principles').select('id, title').order('title'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('documents').select('tags'),
      ]);

      if (principlesRes.data) setPrinciples(principlesRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      
      if (docsRes.data) {
        const allTags = new Set<string>();
        docsRes.data.forEach(doc => {
          (doc.tags || []).forEach(tag => allTags.add(tag));
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    };

    fetchData();
  }, []);

  const toggleTag = (tag: string) => {
    const newTags = props.tags.includes(tag)
      ? props.tags.filter(t => t !== tag)
      : [...props.tags, tag];
    props.onTagsChange(newTags);
  };

  const clearFilters = () => {
    props.onCategoryChange('All');
    props.onPrincipleChange('All');
    props.onProjectChange('All');
    props.onTagsChange([]);
    props.onDateRangeChange('all');
  };

  const activeFiltersCount = 
    (props.category !== 'All' ? 1 : 0) +
    (props.principleId !== 'All' ? 1 : 0) +
    (props.projectId !== 'All' ? 1 : 0) +
    props.tags.length +
    (props.dateRange !== 'all' ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title, content, or tags..."
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          {props.category !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Category: {props.category}
              <button onClick={() => props.onCategoryChange('All')} className="ml-1">×</button>
            </Badge>
          )}
          {props.principleId !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Principle: {principles.find(p => p.id === props.principleId)?.title}
              <button onClick={() => props.onPrincipleChange('All')} className="ml-1">×</button>
            </Badge>
          )}
          {props.projectId !== 'All' && (
            <Badge variant="secondary" className="gap-1">
              Project: {projects.find(p => p.id === props.projectId)?.name}
              <button onClick={() => props.onProjectChange('All')} className="ml-1">×</button>
            </Badge>
          )}
          {props.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => toggleTag(tag)} className="ml-1">×</button>
            </Badge>
          ))}
          {props.dateRange !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {dateRanges.find(d => d.value === props.dateRange)?.label}
              <button onClick={() => props.onDateRangeChange('all')} className="ml-1">×</button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Category
            </label>
            <Select value={props.category} onValueChange={props.onCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Principle
            </label>
            <Select value={props.principleId} onValueChange={props.onPrincipleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Principles</SelectItem>
                {principles.map(principle => (
                  <SelectItem key={principle.id} value={principle.id}>
                    {principle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Project
            </label>
            <Select value={props.projectId} onValueChange={props.onProjectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <Select value={props.dateRange} onValueChange={props.onDateRangeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={props.sortBy} onValueChange={props.onSortChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableTags.length > 0 && (
            <div className="col-span-full space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="flex gap-2 flex-wrap">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={props.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
