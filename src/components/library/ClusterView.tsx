import { Document } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { formatFileSize, getFileTypeLabel } from "@/lib/fileParser";

interface ClusterViewProps {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
}

interface Cluster {
  id: string;
  label: string;
  keywords: string[];
  documents: Document[];
}

export function ClusterView({ documents, onDocumentClick }: ClusterViewProps) {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  // Cluster documents by principle, then by shared tags
  const clusters = useMemo(() => {
    const clusterMap = new Map<string, Cluster>();
    const uncategorized: Document[] = [];

    documents.forEach(doc => {
      let clusterId: string;
      let clusterLabel: string;
      let clusterKeywords: string[] = [];

      if (doc.primary_principle_id) {
        clusterId = `principle-${doc.primary_principle_id}`;
        clusterLabel = "Principle-aligned";
        clusterKeywords = doc.tags?.slice(0, 3) || [];
      } else if (doc.linked_project_id) {
        clusterId = `project-${doc.linked_project_id}`;
        clusterLabel = "Project-linked";
        clusterKeywords = doc.tags?.slice(0, 3) || [];
      } else if (doc.category) {
        clusterId = `category-${doc.category}`;
        clusterLabel = doc.category;
        clusterKeywords = doc.tags?.slice(0, 3) || [];
      } else if (doc.tags && doc.tags.length > 0) {
        // Group by primary tag
        clusterId = `tag-${doc.tags[0]}`;
        clusterLabel = doc.tags[0];
        clusterKeywords = doc.tags.slice(1, 4);
      } else {
        uncategorized.push(doc);
        return;
      }

      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, {
          id: clusterId,
          label: clusterLabel,
          keywords: clusterKeywords,
          documents: [],
        });
      }

      clusterMap.get(clusterId)!.documents.push(doc);
    });

    // Add uncategorized cluster if needed
    if (uncategorized.length > 0) {
      clusterMap.set('uncategorized', {
        id: 'uncategorized',
        label: 'Uncategorized',
        keywords: [],
        documents: uncategorized,
      });
    }

    return Array.from(clusterMap.values()).sort((a, b) => b.documents.length - a.documents.length);
  }, [documents]);

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedClusters(new Set(clusters.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedClusters(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {clusters.length} clusters • {documents.length} documents
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {clusters.map(cluster => {
        const isExpanded = expandedClusters.has(cluster.id);
        
        return (
          <Card key={cluster.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleCluster(cluster.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-base">{cluster.label}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{cluster.documents.length} docs</Badge>
                      {cluster.keywords.map(kw => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {cluster.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => onDocumentClick(doc)}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{doc.title}</div>
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {doc.summary}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {doc.category && (
                              <Badge variant="secondary" className="text-xs">
                                {doc.category}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(doc.file_type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
