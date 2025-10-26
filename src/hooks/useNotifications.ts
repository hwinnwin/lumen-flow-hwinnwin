import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: 'info' | 'warn' | 'critical';
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationSettings {
  user_id: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  channel_inapp: boolean;
  channel_email: boolean;
  channel_slack: boolean;
  channel_discord: boolean;
  digest_daily: boolean;
  digest_time: string;
  nudges_enabled: boolean;
  critical_only: boolean;
  muted_entities: Array<{ type: string; id: string }>;
  created_at: string;
  updated_at: string;
}

export const useNotifications = (filters?: {
  severity?: string;
  type?: string;
  unreadOnly?: boolean;
}) => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.unreadOnly) {
        query = query.is('read_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsUnread = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: null })
        .in('id', notificationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotifications = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notifications deleted' });
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Show toast for new notifications
          const severityColor = {
            info: 'default',
            warn: 'default',
            critical: 'destructive',
          }[newNotif.severity] as any;

          toast({
            title: newNotif.title,
            description: newNotif.body,
            variant: severityColor,
          });
          
          // Navigate on click if action URL exists
          if (newNotif.action_url) {
            setTimeout(() => {
              if (confirm(`View: ${newNotif.title}?`)) {
                window.location.href = newNotif.action_url!;
              }
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unreadCount = notifications?.filter(n => !n.read_at).length ?? 0;

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAsUnread,
    deleteNotifications,
  };
};

export const useNotificationSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Create default settings if none exist
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings as NotificationSettings;
      }

      return data as NotificationSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Settings updated' });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};