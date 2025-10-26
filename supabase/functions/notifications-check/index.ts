import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toZonedTime, formatInTimeZone } from 'https://esm.sh/date-fns-tz@3.2.0';
import { differenceInHours, differenceInDays, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TZ = 'Australia/Melbourne';

interface NotificationSettings {
  user_id: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  channel_inapp: boolean;
  channel_email: boolean;
  nudges_enabled: boolean;
  critical_only: boolean;
  muted_entities: Array<{ type: string; id: string }>;
}

function isInQuietHours(settings: NotificationSettings): boolean {
  const now = toZonedTime(new Date(), TZ);
  const timeStr = formatInTimeZone(now, TZ, 'HH:mm:ss');
  
  const start = settings.quiet_hours_start;
  const end = settings.quiet_hours_end;
  
  // Handle overnight quiet hours (e.g., 21:00 to 08:00)
  if (start > end) {
    return timeStr >= start || timeStr <= end;
  }
  return timeStr >= start && timeStr <= end;
}

async function checkDuplicate(
  supabase: any,
  userId: string,
  type: string,
  entityId: string | null,
  hours: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_similar_notification', {
    p_user_id: userId,
    p_type: type,
    p_entity: entityId,
    p_window_hours: hours
  });
  
  if (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }
  
  return data === true;
}

async function createNotification(
  supabase: any,
  userId: string,
  type: string,
  title: string,
  body: string,
  severity: 'info' | 'warn' | 'critical',
  entityType: string | null,
  entityId: string | null,
  actionUrl: string | null
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      severity,
      entity_type: entityType,
      entity_id: entityId,
      action_url: actionUrl,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }
  
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting notification check...');

    // Get all users with settings
    const { data: allSettings } = await supabase
      .from('notification_settings')
      .select('*');

    if (!allSettings || allSettings.length === 0) {
      console.log('No users with notification settings');
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notificationsCreated = 0;
    const now = new Date();

    for (const settings of allSettings) {
      const userId = settings.user_id;
      
      if (!settings.nudges_enabled) continue;

      const inQuiet = isInQuietHours(settings);
      
      // 1. Check project deadlines
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, deadline')
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('deadline', 'is', null);

      for (const project of projects || []) {
        if (!project.deadline) continue;
        
        // Get open tasks count
        const { count: openTasks } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .neq('status', 'completed');
        
        const deadline = parseISO(project.deadline);
        const daysUntil = differenceInDays(deadline, now);
        
        if (daysUntil <= 3 && daysUntil >= 0 && (openTasks || 0) > 0) {
          const isDupe = await checkDuplicate(supabase, userId, 'project_deadline', project.id, 6);
          if (isDupe) continue;
          
          const severity = daysUntil <= 1 ? 'critical' : 'warn';
          
          if (severity === 'critical' || !inQuiet) {
            await createNotification(
              supabase,
              userId,
              'project_deadline',
              `Project deadline approaching: ${project.name}`,
              `${openTasks || 0} open tasks remaining. Deadline in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
              severity,
              'project',
              project.id,
              `/projects?id=${project.id}`
            );
            notificationsCreated++;
          }
        }
      }

      // 2. Check overdue tasks
      const { data: allUserProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId);
      
      const projectIds = allUserProjects?.map(p => p.id) || [];
      
      if (projectIds.length === 0) continue;

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, project_id, project:projects(name)')
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .in('project_id', projectIds);

      for (const task of tasks || []) {
        if (!task.due_date) continue;
        
        const dueDate = parseISO(task.due_date);
        const hoursOverdue = differenceInHours(now, dueDate);
        
        if (hoursOverdue > 0) {
          const isDupe = await checkDuplicate(supabase, userId, 'task_overdue', task.id, 6);
          if (isDupe) continue;
          
          const severity = hoursOverdue > 24 ? 'critical' : 'warn';
          const projectName = (task.project as any)?.name || 'Unknown project';
          
          if (severity === 'critical' || !inQuiet) {
            await createNotification(
              supabase,
              userId,
              'task_overdue',
              `Task overdue: ${task.title}`,
              `This task is ${Math.floor(hoursOverdue / 24)} days overdue in ${projectName}.`,
              severity,
              'task',
              task.id,
              `/workflow?task=${task.id}`
            );
            notificationsCreated++;
          }
        }
      }

      // 3. Check stale projects
      const { data: staleProjects } = await supabase
        .from('projects')
        .select('id, name, updated_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      for (const project of staleProjects || []) {
        const daysSinceUpdate = differenceInDays(now, parseISO(project.updated_at));
        
        if (daysSinceUpdate >= 5) {
          const isDupe = await checkDuplicate(supabase, userId, 'project_stale', project.id, 24);
          if (isDupe) continue;
          
          if (!inQuiet && !settings.critical_only) {
            await createNotification(
              supabase,
              userId,
              'project_stale',
              `Inactive project: ${project.name}`,
              `No activity in ${daysSinceUpdate} days. Consider updating or archiving.`,
              'info',
              'project',
              project.id,
              `/projects?id=${project.id}`
            );
            notificationsCreated++;
          }
        }
      }

      // 4. Check Daily Focus nudge
      const localTime = formatInTimeZone(toZonedTime(now, TZ), TZ, 'HH:mm');
      if (localTime >= '14:00' && localTime <= '15:00') {
        const today = formatInTimeZone(toZonedTime(now, TZ), TZ, 'yyyy-MM-dd');
        
        const { data: todaysFocus } = await supabase
          .from('daily_focus')
          .select('id, top_actions')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (todaysFocus) {
          const { data: completedActions } = await supabase
            .from('focus_actions')
            .select('action_id')
            .eq('user_id', userId)
            .not('completed_at', 'is', null);

          const completedIds = new Set(completedActions?.map((a: any) => a.action_id) || []);
          const topActions = todaysFocus.top_actions || [];
          const notStarted = topActions.filter((a: any) => !completedIds.has(a.id));

          if (notStarted.length === topActions.length) {
            const isDupe = await checkDuplicate(supabase, userId, 'daily_focus_nudge', null, 6);
            if (!isDupe && !inQuiet && !settings.critical_only) {
              await createNotification(
                supabase,
                userId,
                'daily_focus_nudge',
                "Today's top actions not started",
                `You have ${topActions.length} priority actions for today. Take a look!`,
                'info',
                'daily_focus',
                todaysFocus.id,
                '/dashboard'
              );
              notificationsCreated++;
            }
          }
        }
      }

      // 5. Check low-alignment documents
      const { data: lowAlignDocs } = await supabase
        .from('documents')
        .select('id, title, principle_alignment_score')
        .eq('user_id', userId)
        .lt('principle_alignment_score', 60)
        .is('user_override', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      for (const doc of lowAlignDocs || []) {
        const isDupe = await checkDuplicate(supabase, userId, 'doc_low_alignment', doc.id, 24);
        if (isDupe) continue;
        
        if (!inQuiet && !settings.critical_only) {
          await createNotification(
            supabase,
            userId,
            'doc_low_alignment',
            `Low alignment score: ${doc.title}`,
            `This document has a ${doc.principle_alignment_score}% alignment. Consider reviewing tags and links.`,
            'info',
            'document',
            doc.id,
            `/library?doc=${doc.id}`
          );
          notificationsCreated++;
        }
      }
    }

    console.log(`Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({ success: true, created: notificationsCreated }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in notifications-check:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});