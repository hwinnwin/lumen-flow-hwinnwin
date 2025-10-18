import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching user context for daily focus generation...');

    // Fetch all context data in parallel
    const [principlesRes, projectsRes, documentsRes, sopsRes, tasksRes, actionsRes] = await Promise.all([
      supabaseClient.from('principles').select('*').eq('user_id', user.id),
      supabaseClient.from('projects').select('*').eq('user_id', user.id),
      supabaseClient.from('documents').select('id, title, summary, category, created_at, primary_principle_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabaseClient.from('sops').select('id, title, description, category').eq('user_id', user.id),
      supabaseClient.from('tasks').select('*').order('due_date', { ascending: true }),
      supabaseClient.from('focus_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    ]);

    const principles = principlesRes.data || [];
    const projects = projectsRes.data || [];
    const documents = documentsRes.data || [];
    const sops = sopsRes.data || [];
    const tasks = tasksRes.data || [];
    const recentActions = actionsRes.data || [];

    console.log('Context fetched:', { 
      principles: principles.length, 
      projects: projects.length, 
      documents: documents.length, 
      tasks: tasks.length 
    });

    // Build AI prompt with full context
    const systemPrompt = `You are Lumen's Priority Intelligence system. Analyze the user's entire workspace and generate today's focus plan.

CONTEXT:
Guiding Principles (${principles.length}):
${principles.map(p => `- ${p.title}: ${p.content?.substring(0, 150) || p.description || ''}`).join('\n')}

Active Projects (${projects.length}):
${projects.map(p => `- ${p.name}: ${p.description || 'No description'}`).join('\n')}

Recent Documents (last 10):
${documents.map(d => `- ${d.title} (${d.category}) - ${d.summary?.substring(0, 100) || 'No summary'}`).join('\n')}

SOPs Available (${sops.length}):
${sops.map(s => `- ${s.title} (${s.category || 'General'})`).join('\n')}

Tasks (${tasks.length}):
${tasks.map(t => `- [${t.priority || 'medium'}] ${t.title} - Status: ${t.status || 'pending'} - Due: ${t.due_date || 'No deadline'}`).join('\n')}

Recent User Actions (last 20):
${recentActions.map(a => `- ${a.title} (${a.priority_level}) - ${a.completed_at ? 'Completed' : a.deferred ? 'Deferred' : a.ignored ? 'Ignored' : 'Pending'}`).join('\n')}

ANALYSIS FRAMEWORK:
1. Principle Alignment Check - Which projects/tasks are most aligned with core principles?
2. Urgency & Impact Matrix - What's time-sensitive today? What has highest impact?
3. Flow State Optimization - Based on history, what's best to tackle now?
4. Risk Identification - Any projects showing warning signs?
5. Strategic Opportunities - Quick wins available today?

Generate today's focus plan with:
1. Daily Focus Theme (inspiring, actionable paragraph)
2. Top 3 Priority Actions (with reasoning tied to principles)
3. Project Health Summary (status, recommendations)
4. Key Insights (patterns, risks, opportunities)
5. Suggested Questions for the user to ask Lumen

Respond ONLY with valid JSON in this exact format:
{
  "focus_theme": {
    "title": "string",
    "description": "string (paragraph)",
    "priority_score": number (0-100),
    "aligned_principles": ["string"]
  },
  "top_actions": [
    {
      "priority": "high|medium|low",
      "title": "string",
      "why": "string",
      "impact": "string",
      "related_docs": ["uuid"],
      "related_sops": ["uuid"],
      "quick_action": "string"
    }
  ],
  "project_health": [
    {
      "project_id": "uuid",
      "project_name": "string",
      "status": "on_track|needs_attention|at_risk|blocked",
      "health_score": number (0-100),
      "next_milestone": "string",
      "blocking_issue": "string or null",
      "principle_alignment": number (0-100),
      "ai_recommendation": "string"
    }
  ],
  "insights": [
    {
      "type": "pattern|risk|opportunity|connection",
      "title": "string",
      "description": "string",
      "action": "string"
    }
  ],
  "suggested_questions": ["string"]
}`;

    const userPrompt = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. 

Generate my daily focus plan based on the context provided. Be specific, reference actual projects and documents by name, and ground all recommendations in my guiding principles.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI to generate daily focus...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to your Lovable workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const dailyFocus = JSON.parse(jsonMatch[0]);

    // Store in database
    const today = new Date().toISOString().split('T')[0];
    const { data: savedFocus, error: saveError } = await supabaseClient
      .from('daily_focus')
      .upsert({
        user_id: user.id,
        date: today,
        focus_theme: dailyFocus.focus_theme,
        top_actions: dailyFocus.top_actions,
        project_health: dailyFocus.project_health,
        insights: dailyFocus.insights,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving daily focus:', saveError);
      throw saveError;
    }

    // Create focus action records for top actions
    if (dailyFocus.top_actions && dailyFocus.top_actions.length > 0) {
      const actionRecords = dailyFocus.top_actions.map((action: any, index: number) => ({
        user_id: user.id,
        action_id: `${today}-${index}`,
        priority_level: action.priority,
        title: action.title,
      }));

      await supabaseClient.from('focus_actions').insert(actionRecords);
    }

    console.log('Daily focus saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      daily_focus: savedFocus,
      suggested_questions: dailyFocus.suggested_questions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-daily-focus:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});