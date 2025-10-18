import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, contextType = 'global', contextId } = await req.json();
    
    if (!message) {
      throw new Error('No message provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Unauthorized');
    }

    const { id: userId } = await userResponse.json();

    // Fetch user's context
    const headers = {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    // Fetch principles
    const principlesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/principles?user_id=eq.${userId}&select=id,title,description,priority`,
      { headers }
    );
    const principles = await principlesResponse.json();

    // Fetch projects
    const projectsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&select=id,name,description&limit=10`,
      { headers }
    );
    const projects = await projectsResponse.json();

    // Fetch recent documents
    const docsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?user_id=eq.${userId}&select=id,title,summary,category,tags&order=created_at.desc&limit=10`,
      { headers }
    );
    const documents = await docsResponse.json();

    // Fetch SOPs
    const sopsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/sops?user_id=eq.${userId}&select=id,title,category&limit=10`,
      { headers }
    );
    const sops = await sopsResponse.json();

    // Fetch chat history for context
    let chatHistory = [];
    if (sessionId) {
      const historyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_history?session_id=eq.${sessionId}&select=message,role&order=created_at.asc`,
        { headers }
      );
      chatHistory = await historyResponse.json();
    }

    // Build context snapshot
    const contextSnapshot = {
      principles: principles.length,
      projects: projects.length,
      documents: documents.length,
      sops: sops.length,
      contextType,
      contextId,
    };

    // Build system prompt
    const principlesText = principles.length > 0 
      ? principles.map((p: any) => `- **${p.title}** (${p.priority}): ${p.description || 'No description'}`).join('\n')
      : 'No guiding principles defined yet. Encourage user to create some.';

    const projectsText = projects.length > 0
      ? projects.map((p: any) => `- ${p.name}${p.description ? ': ' + p.description : ''}`).join('\n')
      : 'No projects created yet.';

    const docsText = documents.length > 0
      ? documents.map((d: any) => `- "${d.title}" (${d.category || 'uncategorized'})${d.summary ? ': ' + d.summary : ''}`).join('\n')
      : 'No documents uploaded yet.';

    const sopsText = sops.length > 0
      ? sops.map((s: any) => `- ${s.title} (${s.category || 'uncategorized'})`).join('\n')
      : 'No SOPs created yet.';

    const contextInfo = contextType === 'project' && contextId
      ? `\nCurrent Context: Viewing specific project (ID: ${contextId})`
      : '\nCurrent Context: Global view';

    const systemPrompt = `You are Lumen Assistant - an intelligent flow thought communication system.

Your purpose: Help users navigate their knowledge, understand their work, and make principle-based decisions.

FOUNDATIONAL CONTEXT:

User's Guiding Principles:
${principlesText}

Active Projects:
${projectsText}

Recent Documents:
${docsText}

Available SOPs:
${sopsText}
${contextInfo}

RESPONSE GUIDELINES:
1. Always ground your response in the user's principles when relevant
2. Reference specific documents/SOPs/projects by name when relevant
3. Provide actionable insights, not generic advice
4. Be conversational but intelligent - think partner, not servant
5. When suggesting actions, explain WHY based on principles/goals
6. Use formatting: **bold** for emphasis, bullet points for lists, \`code\` for technical terms
7. If you don't have enough context, ask clarifying questions
8. Keep responses focused and structured

Response format: Natural conversation with clear structure when needed.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((msg: any) => ({ role: msg.role, content: msg.message })),
      { role: 'user', content: message }
    ];

    // Call AI API
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI request failed');
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'X-Context-Snapshot': JSON.stringify(contextSnapshot),
      },
    });

  } catch (error) {
    console.error('Error in chat-assistant:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
