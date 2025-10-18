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
    const { content, fileName, fileType, userId, projectId } = await req.json();
    
    if (!content) {
      throw new Error('No content provided');
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

    // Fetch user's guiding principles
    const principlesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/principles?user_id=eq.${userId}&select=id,title,description,priority`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const principles = await principlesResponse.json();

    // Fetch project context if applicable
    let projectContext = '';
    if (projectId) {
      const projectResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=name,description`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const projects = await projectResponse.json();
      if (projects.length > 0) {
        projectContext = `\nCurrent project: ${projects[0].name}${projects[0].description ? ' - ' + projects[0].description : ''}`;
      }
    }

    // Fetch existing SOPs for context
    const sopsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/sops?user_id=eq.${userId}&select=id,title,category&limit=20`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const sops = await sopsResponse.json();

    // Fetch existing documents for context
    const docsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?user_id=eq.${userId}&select=id,title,category&limit=20`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const existingDocs = await docsResponse.json();

    // Determine if this is structured data
    const isStructuredData = ['json', 'csv', 'xml', 'yaml', 'yml', 'xlsx', 'xls'].some(
      ext => fileType.toLowerCase().includes(ext)
    );

    const principlesText = principles.length > 0 
      ? principles.map((p: any) => `- ${p.title}${p.description ? ': ' + p.description : ''}`).join('\n')
      : 'No guiding principles defined yet.';

    const sopsText = sops.length > 0
      ? sops.map((s: any) => `- ${s.title} (${s.category || 'uncategorized'})`).join('\n')
      : 'No SOPs defined yet.';

    const docsText = existingDocs.length > 0
      ? existingDocs.map((d: any) => `- ${d.title} (${d.category || 'uncategorized'})`).join('\n')
      : 'No documents uploaded yet.';

    const prompt = `You are an AI that operates from foundational principles. Your job is to understand documents through the lens of these principles and organizational context.

FOUNDATIONAL PRINCIPLES:
${principlesText}
${projectContext}

EXISTING LIBRARY CONTEXT:
SOPs:
${sopsText}

Documents:
${docsText}

DOCUMENT TO ANALYZE:
Filename: "${fileName}"
Type: ${fileType}

Content:
${content.substring(0, 8000)}

ANALYSIS INSTRUCTIONS:
Interpret this document through our principles. Instead of just categorizing, understand its PURPOSE and PLACE.

1. **Principle Alignment** (MOST IMPORTANT):
   - Which principle does this document most embody or serve?
   - How does it align with each principle?
   - What outcome does it enable?

2. **Natural Categorization** (flows from principles):
   - Based on principles and goals, what IS this document?
   - Categories: SOP, Principle, Project Note, General Reference

3. **Confidence & Reasoning**:
   - Confidence score: 0-100
   - Why this categorization flows from the principles

4. **Relationships** (based on principle/goal alignment):
   - Which existing SOPs serve the same principle?
   - Which existing documents serve the same principle?
   - Suggest connections based on shared purpose

5. **Metadata**:
   - Title (if unclear from filename)
   - Summary (what it ENABLES, not just what it contains)
   - Tags (prefer existing patterns, create new only if needed)
${isStructuredData ? '\n6. **Data Description** (for structured files):\n   - What kind of data this contains\n   - How it might be used' : ''}

Respond ONLY with valid JSON in this format:
{
  "principle_alignment": {
    "primary_principle_id": "uuid or null if no principles exist",
    "primary_principle_name": "string",
    "alignment_explanation": "string",
    "serves_goal": "string"
  },
  "category": "string",
  "confidence": number (0-100),
  "reasoning": "string (how this flows from principles)",
  "title": "string",
  "summary": "string (purpose-driven)",
  "tags": ["string"],
  "related_items": {
    "sop_ids": ["uuid"],
    "document_ids": ["uuid"],
    "reasoning": "string (why these relate)"
  },
  "suggested_actions": ["string"]${isStructuredData ? ',\n  "data_description": "string"' : ''}
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a document categorization assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
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
      throw new Error('AI categorization failed');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(aiResponse);

    console.log('Categorization successful:', parsedResponse);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in categorize-document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});