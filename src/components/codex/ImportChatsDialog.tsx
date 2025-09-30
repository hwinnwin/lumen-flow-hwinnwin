import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";
import { SimpleSkeleton } from "@/components/ui/SimpleSkeleton";
import { Upload, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chakraCategories, type ChakraCategory } from "@/lib/chakraSystem";

interface ImportChatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onImportComplete?: () => void;
}

export function ImportChatsDialog({ open, onOpenChange, projectId, onImportComplete }: ImportChatsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const Skeleton = ShadcnSkeleton || SimpleSkeleton;

  if (!projectId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const categorizeChat = (title: string, content: string): ChakraCategory => {
    const text = `${title} ${content}`.toLowerCase();
    
    // Simple keyword-based categorization
    if (text.match(/strategy|vision|philosophy|future|purpose|meaning/)) return 'crown';
    if (text.match(/research|analysis|insight|learn|study|understand/)) return 'third_eye';
    if (text.match(/write|communication|content|blog|article|message/)) return 'throat';
    if (text.match(/healing|growth|relationship|emotion|heart|personal/)) return 'heart';
    if (text.match(/task|action|productivity|decision|execute|do/)) return 'solar_plexus';
    if (text.match(/creative|innovation|idea|design|experiment|new/)) return 'sacral';
    if (text.match(/system|structure|technical|foundation|security|basic/)) return 'root';
    
    return 'uncategorized';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // ChatGPT export format: array of conversations
      const conversations = Array.isArray(data) ? data : [data];
      
      let imported = 0;
      let failed = 0;

      for (const conv of conversations) {
        try {
          const title = conv.title || conv.name || 'Untitled Chat';
          const messages = conv.messages || conv.mapping ? 
            Object.values(conv.mapping).filter((m: any) => m?.message?.content?.parts?.length > 0) : [];
          
          const content = messages
            .map((m: any) => {
              const role = m?.message?.author?.role || 'user';
              const text = m?.message?.content?.parts?.join('\n') || '';
              return `**${role}**: ${text}`;
            })
            .join('\n\n');

          if (!content) continue;

          const chakraCategory = categorizeChat(title, content);
          const chatDate = conv.create_time ? new Date(conv.create_time * 1000) : new Date();

          const { error } = await supabase.from('ai_chats').insert({
            project_id: projectId,
            title,
            content,
            chat_date: chatDate.toISOString(),
            source: 'chatgpt',
            chakra_category: chakraCategory,
            priority: 'medium',
            status: 'review',
            tags: [],
            starred: false
          });

          if (error) {
            console.error('Failed to import chat:', error);
            failed++;
          } else {
            imported++;
          }
        } catch (err) {
          console.error('Error processing conversation:', err);
          failed++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${imported} chat${imported !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      onImportComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to parse the file. Please ensure it's a valid ChatGPT export.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Conversations</DialogTitle>
          <DialogDescription>
            Upload your chat conversation export (JSON format). Chats will be automatically categorized using chakra colors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileJson className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Select your chat export file (JSON format)
            </p>
            <label htmlFor="file-upload">
              <Button disabled={isProcessing} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Chakra Categories</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(chakraCategories).map(([key, { color, label }]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
