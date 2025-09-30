import { supabase } from "@/integrations/supabase/client";

export type EmailSource = {
  id: string;
  user_id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
};

export async function addEmailSource(
  provider: 'gmail' | 'outlook',
  emailAddress: string,
  tokens: {
    access: string;
    refresh: string;
    expiresAt: string;
  }
): Promise<EmailSource> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('email_sources')
    .insert({
      user_id: user.id,
      provider,
      email_address: emailAddress,
      access_token: tokens.access,
      refresh_token: tokens.refresh,
      token_expires_at: tokens.expiresAt,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EmailSource;
}

export async function getActiveEmailSources(): Promise<EmailSource[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('email_sources')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as EmailSource[]) || [];
}

export async function refreshEmailSourceToken(
  sourceId: string,
  newAccessToken: string,
  newRefreshToken: string,
  newExpiresAt: string
): Promise<EmailSource> {
  const { data, error } = await supabase
    .from('email_sources')
    .update({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: newExpiresAt,
    })
    .eq('id', sourceId)
    .select()
    .single();

  if (error) throw error;
  return data as EmailSource;
}

export async function updateLastSync(sourceId: string): Promise<void> {
  const { error } = await supabase
    .from('email_sources')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', sourceId);

  if (error) throw error;
}

export async function deactivateEmailSource(sourceId: string): Promise<void> {
  const { error } = await supabase
    .from('email_sources')
    .update({ is_active: false })
    .eq('id', sourceId);

  if (error) throw error;
}
