import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
    setIsConnecting(true);
    
    try {
      // Get the OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('connect-email', {
        body: { provider }
      });

      if (error) throw error;

      if (data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting email:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect email account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Email Source</DialogTitle>
          <DialogDescription>
            Connect an email account to import messages into your inbox
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <Button
            onClick={() => handleConnectEmail('gmail')}
            disabled={isConnecting}
            className="w-full justify-start"
            variant="outline"
          >
            <Mail className="mr-2 h-4 w-4" />
            Connect Gmail
          </Button>
          
          <Button
            onClick={() => handleConnectEmail('outlook')}
            disabled={isConnecting}
            className="w-full justify-start"
            variant="outline"
          >
            <Mail className="mr-2 h-4 w-4" />
            Connect Outlook
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mt-4">
          <p>Note: You'll need to authorize access to your email account.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
