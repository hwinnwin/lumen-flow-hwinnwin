import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider } = await req.json();
    
    if (!provider || !['gmail', 'outlook'].includes(provider)) {
      throw new Error('Invalid provider');
    }

    // Get environment variables for OAuth
    const clientId = provider === 'gmail' 
      ? Deno.env.get('GOOGLE_CLIENT_ID')
      : Deno.env.get('MICROSOFT_CLIENT_ID');
    
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-oauth-callback`;

    if (!clientId) {
      throw new Error(`${provider.toUpperCase()}_CLIENT_ID not configured`);
    }

    // Generate OAuth URL
    let authUrl: string;
    
    if (provider === 'gmail') {
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');
      
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `prompt=consent`;
    } else {
      const scopes = [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/User.Read'
      ].join(' ');
      
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_mode=query`;
    }

    return new Response(
      JSON.stringify({ authUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in connect-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
