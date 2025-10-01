import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`Syncing emails for user: ${user.id}`);

    // Get active email sources
    const { data: sources, error: sourcesError } = await supabase
      .from('email_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (sourcesError) throw sourcesError;

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No email sources connected', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSynced = 0;

    // Sync each source
    for (const source of sources) {
      console.log(`Syncing source: ${source.email_address} (${source.provider})`);
      
      // Check if token needs refresh
      const tokenExpiresAt = new Date(source.token_expires_at);
      if (tokenExpiresAt < new Date()) {
        console.log('Token expired, refreshing...');
        // TODO: Implement token refresh
        continue;
      }

      // Fetch emails based on provider
      let emails = [];
      
      if (source.provider === 'gmail') {
        emails = await fetchGmailMessages(source.access_token, source.last_sync_at);
      } else if (source.provider === 'outlook') {
        emails = await fetchOutlookMessages(source.access_token, source.last_sync_at);
      }

      console.log(`Found ${emails.length} new emails from ${source.email_address}`);

      // Insert emails into database
      for (const email of emails) {
        const { error: insertError } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
            source_id: source.id,
            subject: email.subject,
            sender: email.sender,
            recipients: email.recipients,
            snippet: email.snippet,
            body: email.body,
            received_at: email.received_at,
            external_id: email.external_id,
            metadata: email.metadata || {},
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting email:', insertError);
          continue;
        }

        totalSynced++;
      }

      // Update last sync time
      await supabase
        .from('email_sources')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', source.id);
    }

    console.log(`Total emails synced: ${totalSynced}`);

    // Trigger AI parsing for unprocessed emails
    if (totalSynced > 0) {
      try {
        await supabase.functions.invoke('parse-emails', {
          body: { user_id: user.id }
        });
      } catch (parseError) {
        console.error('Error triggering parse-emails:', parseError);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Sync completed', synced: totalSynced }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in sync-emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchGmailMessages(accessToken: string, lastSyncAt: string | null) {
  const emails: any[] = [];
  
  try {
    // Build query for new messages
    let query = 'in:inbox';
    if (lastSyncAt) {
      const date = new Date(lastSyncAt);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
      query += ` after:${dateStr}`;
    }

    // List messages
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const listData = await listResponse.json();
    
    if (!listData.messages) {
      return emails;
    }

    // Fetch full message details
    for (const msg of listData.messages) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const msgData = await msgResponse.json();
      
      const headers = msgData.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      let body = msgData.snippet || '';
      
      // Try to get full body
      if (msgData.payload.body?.data) {
        body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (msgData.payload.parts) {
        const textPart = msgData.payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }

      emails.push({
        external_id: msg.id,
        subject,
        sender: from,
        recipients: to.split(',').map((r: string) => r.trim()),
        snippet: msgData.snippet,
        body,
        received_at: new Date(date).toISOString(),
        metadata: { threadId: msg.threadId },
      });
    }
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
  }

  return emails;
}

async function fetchOutlookMessages(accessToken: string, lastSyncAt: string | null) {
  const emails: any[] = [];
  
  try {
    let url = 'https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime DESC';
    
    if (lastSyncAt) {
      const filterDate = new Date(lastSyncAt).toISOString();
      url += `&$filter=receivedDateTime gt ${filterDate}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();
    
    if (!data.value) {
      return emails;
    }

    for (const msg of data.value) {
      emails.push({
        external_id: msg.id,
        subject: msg.subject || '(No Subject)',
        sender: msg.from?.emailAddress?.address || '',
        recipients: msg.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
        snippet: msg.bodyPreview || '',
        body: msg.body?.content || '',
        received_at: msg.receivedDateTime,
        metadata: { conversationId: msg.conversationId },
      });
    }
  } catch (error) {
    console.error('Error fetching Outlook messages:', error);
  }

  return emails;
}