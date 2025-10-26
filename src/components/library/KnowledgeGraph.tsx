import { Document } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ForceGraph2D from "react-force-graph-2d";

interface KnowledgeGraphProps {
  documents: Document[];
  onDocumentClick: (doc: Document) => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'document' | 'principle' | 'project';
  val: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export function KnowledgeGraph({ documents, onDocumentClick }: KnowledgeGraphProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Limit to max 50 documents for performance
    const limitedDocs = documents.slice(0, 50);

    // Add document nodes
    limitedDocs.forEach(doc => {
      const nodeId = `doc-${doc.id}`;
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          name: doc.title,
          type: 'document',
          val: 3,
          color: '#3b82f6', // blue
        });
        nodeIds.add(nodeId);
      }

      // Add principle nodes and links
      if (doc.primary_principle_id) {
        const principleId = `principle-${doc.primary_principle_id}`;
        if (!nodeIds.has(principleId)) {
          const principle = principles.find(p => p.id === doc.primary_principle_id);
          nodes.push({
            id: principleId,
            name: principle?.title || 'Unknown Principle',
            type: 'principle',
            val: 8,
            color: '#a855f7', // purple
          });
          nodeIds.add(principleId);
        }
        links.push({
          source: nodeId,
          target: principleId,
          value: 2,
        });
      }

      // Add project nodes and links
      if (doc.linked_project_id) {
        const projectId = `project-${doc.linked_project_id}`;
        if (!nodeIds.has(projectId)) {
          const project = projects.find(p => p.id === doc.linked_project_id);
          nodes.push({
            id: projectId,
            name: project?.name || 'Unknown Project',
            type: 'project',
            val: 6,
            color: '#10b981', // green
          });
          nodeIds.add(projectId);
        }
        links.push({
          source: nodeId,
          target: projectId,
          value: 2,
        });
      }
    });

    // Add related document links (shared tags)
    limitedDocs.forEach((doc, i) => {
      limitedDocs.slice(i + 1).forEach(otherDoc => {
        const sharedTags = (doc.tags || []).filter(tag => 
          (otherDoc.tags || []).includes(tag)
        );
        if (sharedTags.length > 0) {
          links.push({
            source: `doc-${doc.id}`,
            target: `doc-${otherDoc.id}`,
            value: sharedTags.length,
          });
        }
      });
    });

    return { nodes, links };
  }, [documents, principles, projects]);

  const handleNodeClick = useCallback((node: any) => {
    if (node.type === 'document') {
      const docId = node.id.replace('doc-', '');
      const doc = documents.find(d => d.id === docId);
      if (doc) onDocumentClick(doc);
    }
  }, [documents, onDocumentClick]);

  const size = isExpanded ? 800 : 400;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Knowledge Graph</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            Documents
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#a855f7]" />
            Principles
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            Projects
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-background overflow-hidden">
          <ForceGraph2D
            graphData={graphData}
            width={size}
            height={size}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkColor={() => '#64748b50'}
            linkWidth={link => link.value}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            d3VelocityDecay={0.3}
          />
        </div>
        {documents.length > 50 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing first 50 documents for performance
          </p>
        )}
      </CardContent>
    </Card>
  );
}
