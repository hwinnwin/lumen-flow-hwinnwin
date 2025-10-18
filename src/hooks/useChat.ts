import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  message: string;
  role: 'user' | 'assistant';
  created_at: string;
  context_snapshot?: any;
}

export interface ChatSession {
  id: string;
  started_at: string;
  last_active: string;
  context_type: string;
  context_id?: string;
}

export const useChat = (contextType: string = 'global', contextId?: string) => {
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Create or get session
  const initSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to get the most recent session
      const { data: existingSessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('context_type', contextType)
        .eq('context_id', contextId || null)
        .order('last_active', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        setSession(existingSessions[0]);
        return existingSessions[0];
      }

      // Create new session
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          context_type: contextType,
          context_id: contextId,
        }])
        .select()
        .single();

      if (error) throw error;
      setSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat session",
        variant: "destructive",
      });
      return null;
    }
  }, [contextType, contextId, toast]);

  // Load messages for session
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setIsStreaming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get or create session
      let currentSession = session;
      if (!currentSession) {
        currentSession = await initSession();
        if (!currentSession) throw new Error("Failed to create session");
      }

      // Save user message to database
      const { data: userMessage, error: userMessageError } = await supabase
        .from('chat_history')
        .insert([{
          user_id: user.id,
          session_id: currentSession.id,
          message,
          role: 'user',
        }])
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Add user message to UI immediately
      setMessages(prev => [...prev, userMessage as ChatMessage]);

      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("No auth session");

      // Call edge function with streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            sessionId: currentSession.id,
            contextType,
            contextId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let tempMessageId = `temp-${Date.now()}`;

      // Add temporary assistant message
      setMessages(prev => [...prev, {
        id: tempMessageId,
        message: '',
        role: 'assistant',
        created_at: new Date().toISOString(),
      }]);

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  
                  // Update message in UI
                  setMessages(prev => prev.map(msg => 
                    msg.id === tempMessageId 
                      ? { ...msg, message: assistantMessage }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
      }

      // Save assistant message to database
      const { data: savedMessage, error: saveError } = await supabase
        .from('chat_history')
        .insert([{
          user_id: user.id,
          session_id: currentSession.id,
          message: assistantMessage,
          role: 'assistant',
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      // Replace temp message with saved message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? (savedMessage as ChatMessage) : msg
      ));

      // Update session last_active
      await supabase
        .from('chat_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('id', currentSession.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [session, initSession, contextType, contextId, toast]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const sess = await initSession();
      if (sess) {
        await loadMessages(sess.id);
      }
    };
    init();
  }, [initSession, loadMessages]);

  return {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    session,
  };
};
