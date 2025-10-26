import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useDocuments, useCreateDocument, useDeleteDocument, Document } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { extractFileContent, isFileTypeSupported, getFileTypeLabel, formatFileSize, SUPPORTED_FILE_TYPES } from "@/lib/fileParser";
import { Upload, FileText, X, CheckCircle, Loader2, Sparkles, AlertCircle, Grid3x3, Network, List } from "lucide-react";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLibrarySearch } from "@/hooks/useLibrarySearch";
import { DocumentSearchBar } from "@/components/library/DocumentSearchBar";
import { DocumentDetailPanel } from "@/components/library/DocumentDetailPanel";
import { ClusterView } from "@/components/library/ClusterView";
import { KnowledgeGraph } from "@/components/library/KnowledgeGraph";
import { formatInTimeZone } from "date-fns-tz";

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'categorizing' | 'reviewing' | 'complete' | 'error';
  error?: string;
  aiSuggestion?: {
    principle_alignment?: {
      primary_principle_id: string | null;
      primary_principle_name: string;
      alignment_explanation: string;
      serves_goal: string;
    };
    category: string;
    confidence: number;
    reasoning: string;
    title: string;
    summary: string;
    tags: string[];
    related_items?: {
      sop_ids: string[];
      document_ids: string[];
      reasoning: string;
    };
    suggested_actions?: string[];
    data_description?: string;
  };
  editedData?: {
    category: string;
    title: string;
    summary: string;
    tags: string;
    primary_principle_id: string | null;
  };
}

const categories = ["All", "SOP", "Principle", "Project Note", "General Reference"];

type ViewMode = 'grid' | 'cluster' | 'graph';

export default function Library() {
  const { toast } = useToast();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [principles, setPrinciples] = useState<any[]>([]);
  const [noPrinciples, setNoPrinciples] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Use search hook
  const {
    filters,
    updateFilter,
    filteredDocuments,
    semanticMode,
    isSearching,
    highlightMatches,
  } = useLibrarySearch(documents);

  // Calculate related documents for detail panel
  const relatedDocuments = useMemo(() => {
    if (!selectedDocument || !documents) return [];
    
    return documents
      .filter(doc => doc.id !== selectedDocument.id)
      .map(doc => {
        let score = 0;
        
        // Same principle (highest weight)
        if (doc.primary_principle_id === selectedDocument.primary_principle_id && doc.primary_principle_id) {
          score += 10;
        }
        
        // Same project
        if (doc.linked_project_id === selectedDocument.linked_project_id && doc.linked_project_id) {
          score += 8;
        }
        
        // Shared tags
        const sharedTags = (doc.tags || []).filter(tag => 
          (selectedDocument.tags || []).includes(tag)
        );
        score += sharedTags.length * 3;
        
        // Same category
        if (doc.category === selectedDocument.category) {
          score += 2;
        }
        
        return { doc, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ doc }) => doc);
  }, [selectedDocument, documents]);

  // Fetch principles on mount
  useEffect(() => {
    const fetchPrinciples = async () => {
      const { data, error } = await supabase
        .from('principles')
        .select('id, title, description, priority')
        .order('priority', { ascending: false });
      
      if (error) {
        console.error('Error fetching principles:', error);
      } else {
        setPrinciples(data || []);
        setNoPrinciples(!data || data.length === 0);
      }
    };
    
    fetchPrinciples();
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: UploadingFile[] = [];

    for (const file of fileArray) {
      if (!isFileTypeSupported(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50MB size limit`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push({
        file,
        progress: 0,
        status: 'uploading',
      });
    }

    setUploadingFiles(prev => [...prev, ...validFiles]);

    for (let i = 0; i < validFiles.length; i++) {
      await processFile(validFiles[i], uploadingFiles.length + i);
    }
  };

  const processFile = async (uploadingFile: UploadingFile, index: number) => {
    const { file } = uploadingFile;
    
    try {
      updateFileStatus(index, { progress: 10, status: 'uploading' });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      updateFileStatus(index, { progress: 40, status: 'processing' });

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const content = await extractFileContent(file);
      
      updateFileStatus(index, { progress: 60, status: 'categorizing' });

      const { data: aiData, error: aiError } = await supabase.functions.invoke('categorize-document', {
        body: { 
          content, 
          fileName: file.name,
          fileType: file.type,
          userId: user.id,
          projectId: null
        }
      });

      if (aiError) throw aiError;

      updateFileStatus(index, { 
        progress: 90, 
        status: 'reviewing',
        aiSuggestion: aiData,
        editedData: {
          category: aiData.category,
          title: aiData.title,
          summary: aiData.summary,
          tags: aiData.tags.join(', '),
          primary_principle_id: aiData.principle_alignment?.primary_principle_id || null,
        }
      });

    } catch (error) {
      console.error('Error processing file:', error);
      updateFileStatus(index, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process file'
      });
    }
  };

  const updateFileStatus = (index: number, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], ...updates };
      return newFiles;
    });
  };

  const handleEditField = (index: number, field: keyof UploadingFile['editedData'], value: string | null) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = {
        ...newFiles[index],
        editedData: {
          ...newFiles[index].editedData!,
          [field]: value
        }
      };
      return newFiles;
    });
  };

  const handleConfirmDocument = async (index: number) => {
    const uploadingFile = uploadingFiles[index];
    const { file, editedData, aiSuggestion } = uploadingFile;

    if (!editedData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const userOverride = 
        editedData.category !== aiSuggestion?.category ||
        editedData.title !== aiSuggestion?.title ||
        editedData.summary !== aiSuggestion?.summary ||
        editedData.tags !== aiSuggestion?.tags.join(', ') ||
        editedData.primary_principle_id !== aiSuggestion?.principle_alignment?.primary_principle_id;

      const result = await createDocument.mutateAsync({
        file_name: file.name,
        file_type: file.type,
        file_url: publicUrl,
        file_size: file.size,
        category: editedData.category,
        title: editedData.title,
        summary: editedData.summary,
        tags: editedData.tags.split(',').map(t => t.trim()).filter(Boolean),
        data_description: aiSuggestion?.data_description,
        primary_principle_id: editedData.primary_principle_id || null,
        principle_alignment_score: aiSuggestion?.principle_alignment ? 
          Math.round((aiSuggestion.confidence / 100) * 100) : null,
        ai_confidence: aiSuggestion?.confidence || null,
        ai_reasoning: aiSuggestion?.reasoning || null,
        user_override: userOverride,
      });

      if (userOverride && aiSuggestion && result) {
        await supabase.from('ai_learning_log').insert([{
          user_id: user.id,
          document_id: result.id,
          ai_suggestion: aiSuggestion as any,
          user_choice: editedData as any,
          correction_type: 'categorization',
        }]);
        
        toast({
          title: "Learning applied",
          description: "Thanks! I'll learn from your corrections.",
        });
      }

      updateFileStatus(index, { status: 'complete' });

      setTimeout(() => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
      }, 2000);

    } catch (error) {
      updateFileStatus(index, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to save document'
      });
    }
  };

  const handleRejectDocument = async (index: number) => {
    const uploadingFile = uploadingFiles[index];
    const { file } = uploadingFile;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      await supabase.storage.from('documents').remove([filePath]);
      
      setUploadingFiles(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: "Document rejected",
        description: "The file has been removed",
      });
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument.mutateAsync(id);
    }
  };

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc);
    setDetailPanelOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Document Discovery</h1>
              <p className="text-muted-foreground">
                Smart search • Knowledge clustering • Visual connections
                {semanticMode === false && " • Keyword mode"}
              </p>
            </div>
          </div>
          
          {noPrinciples && (
            <Alert className="border-primary/50 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Define guiding principles to unlock principle-driven categorization and better AI organization.
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/principles'}
                  className="ml-4 whitespace-nowrap"
                >
                  Add Principles
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Upload Area */}
        <Card className="border-dashed border-2 bg-card/50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Drop files here or click to browse</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Maximum file size: 50MB
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {Object.values(SUPPORTED_FILE_TYPES).map(type => (
                    <Badge key={type.ext} variant="secondary" className="text-xs">
                      {type.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Input
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="max-w-xs"
                accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
              />
            </div>
          </CardContent>
        </Card>

        {uploadingFiles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Processing Files</h2>
            {uploadingFiles.map((uploadFile, index) => (
              <Card key={index} className="bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {uploadFile.file.name}
                        {uploadFile.status === 'complete' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {uploadFile.status === 'error' && <X className="w-4 h-4 text-destructive" />}
                      </CardTitle>
                      <CardDescription>
                        {formatFileSize(uploadFile.file.size)} • {getFileTypeLabel(uploadFile.file.type)}
                      </CardDescription>
                    </div>
                    {uploadFile.status === 'reviewing' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRejectDocument(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing' || uploadFile.status === 'categorizing') && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {uploadFile.status === 'uploading' && 'Uploading...'}
                          {uploadFile.status === 'processing' && 'Processing file...'}
                          {uploadFile.status === 'categorizing' && 'AI analyzing document...'}
                        </span>
                      </div>
                      <Progress value={uploadFile.progress} />
                    </div>
                  )}

                  {uploadFile.status === 'reviewing' && uploadFile.editedData && (
                    <div className="space-y-4">
                      {noPrinciples && (
                        <Alert className="border-amber-500/50 bg-amber-500/10">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <AlertDescription>
                            No guiding principles found. Consider adding principles to improve categorization.
                          </AlertDescription>
                        </Alert>
                      )}

                      {uploadFile.aiSuggestion?.principle_alignment && (
                        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-lg">Principle Alignment</h3>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground">Serves Principle:</p>
                                <p className="text-base font-semibold">
                                  {uploadFile.aiSuggestion.principle_alignment.primary_principle_name}
                                </p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">How it aligns:</p>
                              <p className="text-sm leading-relaxed">
                                {uploadFile.aiSuggestion.principle_alignment.alignment_explanation}
                              </p>
                            </div>
                            
                            {uploadFile.aiSuggestion.principle_alignment.serves_goal && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">What it enables:</p>
                                <p className="text-sm leading-relaxed">
                                  {uploadFile.aiSuggestion.principle_alignment.serves_goal}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {uploadFile.aiSuggestion?.confidence !== undefined && (
                        <div className={`p-3 rounded-md border ${
                          uploadFile.aiSuggestion.confidence >= 80 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : uploadFile.aiSuggestion.confidence >= 50 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-destructive/10 border-destructive/30'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              AI Confidence: {uploadFile.aiSuggestion.confidence}%
                            </span>
                            <Badge variant={
                              uploadFile.aiSuggestion.confidence >= 80 ? 'default' :
                              uploadFile.aiSuggestion.confidence >= 50 ? 'secondary' : 'destructive'
                            }>
                              {uploadFile.aiSuggestion.confidence >= 80 ? 'High' :
                               uploadFile.aiSuggestion.confidence >= 50 ? 'Medium - Review' : 'Low - Input Needed'}
                            </Badge>
                          </div>
                          <Progress value={uploadFile.aiSuggestion.confidence} className="h-2" />
                        </div>
                      )}

                      {uploadFile.aiSuggestion?.reasoning && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <p className="text-sm font-medium mb-1">AI Reasoning:</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {uploadFile.aiSuggestion.reasoning}
                          </p>
                        </div>
                      )}

                      {principles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Primary Principle</Label>
                          <Select
                            value={uploadFile.editedData.primary_principle_id || 'none'}
                            onValueChange={(value) => handleEditField(index, 'primary_principle_id', value === 'none' ? null : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a principle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {principles.map(principle => (
                                <SelectItem key={principle.id} value={principle.id}>
                                  {principle.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={uploadFile.editedData.category}
                          onValueChange={(value) => handleEditField(index, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => c !== 'All').map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={uploadFile.editedData.title}
                          onChange={(e) => handleEditField(index, 'title', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Summary</Label>
                        <Textarea
                          value={uploadFile.editedData.summary}
                          onChange={(e) => handleEditField(index, 'summary', e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          value={uploadFile.editedData.tags}
                          onChange={(e) => handleEditField(index, 'tags', e.target.value)}
                          placeholder="tag1, tag2, tag3"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button onClick={() => handleConfirmDocument(index)} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm & Save
                        </Button>
                        <Button variant="outline" onClick={() => handleRejectDocument(index)}>
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadFile.status === 'error' && (
                    <div className="text-sm text-destructive">
                      Error: {uploadFile.error}
                    </div>
                  )}

                  {uploadFile.status === 'complete' && (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Document saved successfully
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <DocumentSearchBar
          query={filters.query}
          category={filters.category}
          principleId={filters.principleId}
          projectId={filters.projectId}
          tags={filters.tags}
          dateRange={filters.dateRange}
          sortBy={filters.sortBy}
          onQueryChange={(value) => updateFilter('query', value)}
          onCategoryChange={(value) => updateFilter('category', value)}
          onPrincipleChange={(value) => updateFilter('principleId', value)}
          onProjectChange={(value) => updateFilter('projectId', value)}
          onTagsChange={(value) => updateFilter('tags', value)}
          onDateRangeChange={(value) => updateFilter('dateRange', value)}
          onSortChange={(value) => updateFilter('sortBy', value)}
        />

        {/* View Mode Toggle */}
        <div className="flex gap-2 justify-end">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'cluster' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cluster')}
          >
            <List className="w-4 h-4 mr-2" />
            Cluster
          </Button>
          <Button
            variant={viewMode === 'graph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('graph')}
          >
            <Network className="w-4 h-4 mr-2" />
            Graph
          </Button>
        </div>

        {/* Results Count */}
        {filteredDocuments.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'} found
            {filters.query && ` for "${filters.query}"`}
          </div>
        )}

        {/* Documents View */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SimpleSkeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <>
            {viewMode === 'grid' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map(doc => (
                  <Card 
                    key={doc.id} 
                    className="bg-card hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{doc.title}</span>
                          </CardTitle>
                          <div className="flex gap-2 flex-wrap">
                            {doc.category && <Badge variant="secondary">{doc.category}</Badge>}
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(doc.file_type)}
                            </Badge>
                            {(doc as any)._searchScore && filters.query && (
                              <Badge variant="secondary" className="text-xs">
                                {Math.round((doc as any)._searchScore)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doc.summary && (
                        <div 
                          className="text-sm text-muted-foreground line-clamp-3"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatches(doc.summary, filters.query) 
                          }}
                        />
                      )}
                      
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {doc.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{doc.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {formatInTimeZone(new Date(doc.created_at), 'Australia/Melbourne', 'PP')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {viewMode === 'cluster' && (
              <ClusterView documents={filteredDocuments} onDocumentClick={handleDocumentClick} />
            )}

            {viewMode === 'graph' && (
              <KnowledgeGraph documents={filteredDocuments} onDocumentClick={handleDocumentClick} />
            )}
          </>
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground text-center">
                {filters.query || filters.category !== 'All' || filters.principleId !== 'All' || filters.projectId !== 'All' || filters.tags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Upload your first document to get started"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Document Detail Panel */}
        <DocumentDetailPanel
          document={selectedDocument}
          relatedDocs={relatedDocuments}
          open={detailPanelOpen}
          onOpenChange={setDetailPanelOpen}
          onDelete={handleDelete}
          highlightMatches={highlightMatches}
          searchQuery={filters.query}
        />
      </div>
    </Layout>
  );
}

