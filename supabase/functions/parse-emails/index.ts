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

    const { user_id } = await req.json();

    console.log(`Parsing emails for user: ${user_id}`);

    // Get unparsed emails
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', user_id)
      .is('id', null) // Only get emails not yet parsed
      .order('received_at', { ascending: false })
      .limit(10);

    if (emailsError) throw emailsError;

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No emails to parse', parsed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unparsed emails (those without ai_chats entry)
    const { data: parsedEmailIds, error: parsedError } = await supabase
      .from('ai_chats')
      .select('email_id')
      .not('email_id', 'is', null);

    if (parsedError) throw parsedError;

    const parsedIds = new Set(parsedEmailIds?.map(p => p.email_id) || []);
    const unparsedEmails = emails.filter(e => !parsedIds.has(e.id));

    console.log(`Found ${unparsedEmails.length} unparsed emails`);

    let parsed = 0;

    // Parse each email with AI
    for (const email of unparsedEmails) {
      try {
        const result = await parseEmailWithAI(email);
        
        if (result) {
          // Insert into ai_chats
          const { error: insertError } = await supabase
            .from('ai_chats')
            .insert({
              project_id: user_id, // Using user_id as project_id for now
              email_id: email.id,
              title: result.title || email.subject,
              content: result.content || email.body,
              source: 'email',
              chakra_category: result.chakra_category || null,
              tags: result.tags || [],
              priority: result.priority || null,
              status: 'active',
              chat_date: email.received_at,
            });

          if (insertError) {
            console.error('Error inserting parsed email:', insertError);
            continue;
          }

          parsed++;
        }
      } catch (parseError) {
        console.error(`Error parsing email ${email.id}:`, parseError);
      }
    }

    console.log(`Parsed ${parsed} emails`);

    return new Response(
      JSON.stringify({ message: 'Parsing completed', parsed }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in parse-emails:', error);
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

// Stub AI parsing function - will be enhanced later with Lovable AI
async function parseEmailWithAI(email: any) {
  console.log(`Parsing email: ${email.subject}`);
  
  // Stub implementation - classify based on simple keywords
  const body = (email.body || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const text = `${subject} ${body}`;
  
  let chakra_category = null;
  let tags: string[] = [];
  let priority = null;
  
  // Simple keyword-based classification (will be replaced with AI)
  if (text.includes('urgent') || text.includes('asap') || text.includes('important')) {
    priority = 'high';
    chakra_category = 'solar_plexus'; // Action/urgency
  }
  
  if (text.includes('meeting') || text.includes('call') || text.includes('schedule')) {
    tags.push('meeting');
    chakra_category = chakra_category || 'throat'; // Communication
  }
  
  if (text.includes('task') || text.includes('todo') || text.includes('action')) {
    tags.push('task');
    chakra_category = chakra_category || 'sacral'; // Creativity/work
  }
  
  if (text.includes('report') || text.includes('analysis') || text.includes('data')) {
    tags.push('insight');
    chakra_category = chakra_category || 'third_eye'; // Insight/analysis
  }
  
  if (text.includes('framework') || text.includes('process') || text.includes('system')) {
    tags.push('framework');
    chakra_category = chakra_category || 'crown'; // Higher-level thinking
  }

  // Extract simple tags from subject
  const words = subject.split(/\s+/).filter((w: string) => w.length > 3);
  tags = [...tags, ...words.slice(0, 3)];
  
  return {
    title: email.subject || '(No Subject)',
    content: email.body || email.snippet || '',
    chakra_category,
    tags: [...new Set(tags)], // Remove duplicates
    priority: priority || 'medium',
  };
}