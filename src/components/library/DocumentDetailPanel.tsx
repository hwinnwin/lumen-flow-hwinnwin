import { Document } from "@/hooks/useDocuments";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Link as LinkIcon,
  Tag,
  FolderOpen,
  AlertTriangle,
  MessageSquare,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateDocument } from "@/hooks/useDocuments";
import { formatFileSize, getFileTypeLabel } from "@/lib/fileParser";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

interface DocumentDetailPanelProps {
  document: Document | null;
  relatedDocs: Document[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  highlightMatches: (text: string, query: string) => ReactNode;
  searchQuery: string;
}

export function DocumentDetailPanel({
  document,
  relatedDocs,
  open,
  onOpenChange,
  onDelete,
  highlightMatches,
  searchQuery,
}: DocumentDetailPanelProps) {
  const { toast } = useToast();
  const updateDocument = useUpdateDocument();
  const [newTag, setNewTag] = useState("");
  const [principles, setPrinciples] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [principlesRes, projectsRes] = await Promise.all([
        supabase.from('principles').select('id, title').order('title'),
        supabase.from('projects').select('id, name').order('name'),
      ]);
      if (principlesRes.data) setPrinciples(principlesRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
    };
    fetchData();
  }, []);

  if (!document) return null;

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    const newTags = [...(document.tags || []), newTag.trim()];
    await updateDocument.mutateAsync({
      id: document.id,
      tags: newTags,
    });
    setNewTag("");
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = (document.tags || []).filter(t => t !== tag);
    await updateDocument.mutateAsync({
      id: document.id,
      tags: newTags,
    });
  };

  const handleLinkPrinciple = async (principleId: string | null) => {
    await updateDocument.mutateAsync({
      id: document.id,
      primary_principle_id: principleId,
    });
  };

  const handleLinkProject = async (projectId: string | null) => {
    await updateDocument.mutateAsync({
      id: document.id,
      linked_project_id: projectId,
    });
  };

  const handleMarkMisaligned = async () => {
    await updateDocument.mutateAsync({
      id: document.id,
      user_override: true,
    });
    toast({
      title: "Marked as misaligned",
      description: "This feedback will help improve future suggestions",
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/library?doc=${document.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleSendToAssistant = () => {
    const context = `Document: ${document.title}\n\nSummary: ${document.summary || 'N/A'}\n\nTags: ${(document.tags || []).join(', ')}`;
    window.location.href = `/assistant?context=${encodeURIComponent(context)}`;
  };

  const excerpt = document.summary || "No summary available";
  const highlightedExcerpt = highlightMatches(excerpt.slice(0, 300), searchQuery);
  const melbourneDate = formatInTimeZone(new Date(document.updated_at), 'Australia/Melbourne', 'PPp');

  const confidenceColor = (score?: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start gap-2">
            <span className="flex-1">{document.title}</span>
            {(document as any)._searchScore && (
              <Badge variant="secondary" className="shrink-0">
                {Math.round((document as any)._searchScore)}% match
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="flex gap-2 flex-wrap">
            {document.category && <Badge variant="secondary">{document.category}</Badge>}
            <Badge variant="outline">{getFileTypeLabel(document.file_type)}</Badge>
            <span className="text-xs text-muted-foreground">{formatFileSize(document.file_size)}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{melbourneDate}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {highlightedExcerpt}
            </div>
            {excerpt.length > 300 && <span className="text-xs text-muted-foreground">...</span>}
          </div>

          {/* Alignment Score */}
          {document.principle_alignment_score && (
            <div className="p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Principle Alignment</span>
                <span className={`text-sm font-semibold ${confidenceColor(document.principle_alignment_score)}`}>
                  {document.principle_alignment_score}%
                </span>
              </div>
              {document.ai_reasoning && (
                <p className="text-xs text-muted-foreground">{document.ai_reasoning}</p>
              )}
              {document.user_override && (
                <Badge variant="outline" className="text-xs">
                  User corrected
                </Badge>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="flex gap-2 flex-wrap">
              {(document.tags || []).map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>

          {/* Link to Principle */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Link to Principle
            </h3>
            <select
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              value={document.primary_principle_id || ''}
              onChange={(e) => handleLinkPrinciple(e.target.value || null)}
            >
              <option value="">None</option>
              {principles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Link to Project */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Link to Project
            </h3>
            <select
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              value={document.linked_project_id || ''}
              onChange={(e) => handleLinkProject(e.target.value || null)}
            >
              <option value="">None</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Related Documents */}
          {relatedDocs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Related Documents</h3>
              <div className="space-y-2">
                {relatedDocs.map(related => (
                  <div
                    key={related.id}
                    className="p-2 rounded border bg-card hover:bg-accent cursor-pointer text-sm"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => {
                        // This will be handled by parent
                      }, 100);
                    }}
                  >
                    <div className="font-medium">{related.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {related.primary_principle_id === document.primary_principle_id && "Same principle"}
                      {related.linked_project_id === document.linked_project_id && related.linked_project_id && " • Same project"}
                      {(related.tags || []).some(t => (document.tags || []).includes(t)) && " • Shared tags"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open(document.file_url, '_blank')}>
              <Download className="w-4 h-4 mr-2" />
              Open File
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleCopyLink}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleSendToAssistant}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send to Assistant
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleMarkMisaligned}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mark Misaligned
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                if (confirm('Delete this document?')) {
                  onDelete(document.id);
                  onOpenChange(false);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Document
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
