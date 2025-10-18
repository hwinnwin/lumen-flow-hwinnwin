import { useState } from "react";
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
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { extractFileContent, isFileTypeSupported, getFileTypeLabel, formatFileSize, SUPPORTED_FILE_TYPES } from "@/lib/fileParser";
import { Upload, FileText, Search, Filter, Download, Trash2, X, CheckCircle, Loader2 } from "lucide-react";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'categorizing' | 'reviewing' | 'complete' | 'error';
  error?: string;
  aiSuggestion?: {
    category: string;
    title: string;
    summary: string;
    tags: string[];
    data_description?: string;
  };
  editedData?: {
    category: string;
    title: string;
    summary: string;
    tags: string;
  };
}

const categories = ["All", "SOP", "Principle", "Project Note", "General Reference"];

export default function Library() {
  const { toast } = useToast();
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFileType, setSelectedFileType] = useState("All");

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

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
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

    // Process each file
    for (let i = 0; i < validFiles.length; i++) {
      await processFile(validFiles[i], uploadingFiles.length + i);
    }
  };

  const processFile = async (uploadingFile: UploadingFile, index: number) => {
    const { file } = uploadingFile;
    
    try {
      // Update status to uploading
      updateFileStatus(index, { progress: 10, status: 'uploading' });

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      updateFileStatus(index, { progress: 40, status: 'processing' });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Extract content
      const content = await extractFileContent(file);
      
      updateFileStatus(index, { progress: 60, status: 'categorizing' });

      // Call AI categorization
      const { data: aiData, error: aiError } = await supabase.functions.invoke('categorize-document', {
        body: { 
          content, 
          fileName: file.name,
          fileType: file.type 
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

  const handleEditField = (index: number, field: keyof UploadingFile['editedData'], value: string) => {
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

      await createDocument.mutateAsync({
        file_name: file.name,
        file_type: file.type,
        file_url: publicUrl,
        file_size: file.size,
        category: editedData.category,
        title: editedData.title,
        summary: editedData.summary,
        tags: editedData.tags.split(',').map(t => t.trim()).filter(Boolean),
        data_description: aiSuggestion?.data_description,
      });

      updateFileStatus(index, { status: 'complete' });

      // Remove after a delay
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

  const handleDownload = (doc: any) => {
    window.open(doc.file_url, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument.mutateAsync(id);
    }
  };

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = searchTerm === "" || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    const matchesFileType = selectedFileType === "All" || doc.file_type === selectedFileType;
    
    return matchesSearch && matchesCategory && matchesFileType;
  });

  const uniqueFileTypes = ["All", ...Array.from(new Set(documents?.map(d => d.file_type) || []))];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Library</h1>
            <p className="text-muted-foreground">Upload and organize your documents with AI-powered categorization</p>
          </div>
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

        {/* Uploading Files */}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectDocument(index)}
                      >
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

                      {uploadFile.aiSuggestion?.data_description && (
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">Data Description:</p>
                          <p className="text-sm text-muted-foreground">{uploadFile.aiSuggestion.data_description}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={() => handleConfirmDocument(index)} className="flex-1">
                          Confirm & Save
                        </Button>
                        <Button variant="outline" onClick={() => handleRejectDocument(index)}>
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

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFileType} onValueChange={setSelectedFileType}>
            <SelectTrigger className="w-[200px]">
              <FileText className="w-4 h-4 mr-2" />
              <SelectValue placeholder="File Type" />
            </SelectTrigger>
            <SelectContent>
              {uniqueFileTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type === "All" ? "All Types" : getFileTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SimpleSkeleton key={i} />
            ))}
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => (
              <Card key={doc.id} className="bg-card hover:shadow-lg transition-shadow">
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
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{doc.summary}</p>
                  )}
                  
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm || selectedCategory !== "All" || selectedFileType !== "All"
                  ? "Try adjusting your filters"
                  : "Upload your first document to get started"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}