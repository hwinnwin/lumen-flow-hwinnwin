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
        // Open OAuth in popup window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.authUrl,
          'oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        const handleMessage = async (event: MessageEvent) => {
          if (event.data.type === 'oauth-success') {
            const { provider, emailAddress, accessToken, refreshToken, expiresAt } = event.data;
            
            // Store the email source in database
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              const { error: insertError } = await supabase
                .from('email_sources')
                .insert({
                  user_id: user.id,
                  provider,
                  email_address: emailAddress,
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  token_expires_at: expiresAt,
                  is_active: true,
                });

              if (insertError) {
                console.error('Error saving email source:', insertError);
                toast({
                  title: "Error",
                  description: "Failed to save email connection.",
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "Connected!",
                  description: `Successfully connected ${emailAddress}`,
                });
                onOpenChange(false);
              }
            }
            
            window.removeEventListener('message', handleMessage);
            if (popup) popup.close();
          }
        };

        window.addEventListener('message', handleMessage);
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
