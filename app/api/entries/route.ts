import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    
    // Check if already submitted for this date
    const { data: existingEntries } = await supabase
      .from('pgepl_entries')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('work_date', body.work_date)
      .limit(1);

    if (existingEntries && existingEntries.length > 0) {
      return NextResponse.json({ error: 'You have already submitted a daily report for this date.' }, { status: 400 });
    }

    // Insert into DB
    const { data, error } = await supabase.from('pgepl_entries').insert({
      user_id: decoded.userId,
      work_date: body.work_date,
      department: body.department,
      kra_category: body.kra_category,
      tasks_text: body.tasks_text,
      hours_spent: body.hours_spent,
      task_status: body.task_status,
      has_issue: body.has_issue,
      issue_description: body.issue_description || null,
      plan_for_tomorrow: body.plan_for_tomorrow || null,
      approval_status: 'Submitted'
    }).select().single();

    if (error) throw error;

    // Create notifications for managers
    const { data: managers } = await supabase.from('pgepl_users').select('id').eq('role', 'manager');
    if (managers) {
      const notifications = managers.map(mgr => ({
        user_id: mgr.id,
        message: body.has_issue 
          ? `⚠ ${decoded.name} flagged an issue: ${body.issue_description?.substring(0, 30)}...`
          : `New report submitted by ${decoded.name} (${body.department})`,
        type: body.has_issue ? 'issue' : 'submission'
      }));
      await supabase.from('pgepl_notifications').insert(notifications);
    }

    // Create Audit Log
    await supabase.from('pgepl_audit_logs').insert({
      user_id: decoded.userId,
      action: 'Submitted Daily Report',
      target_type: 'entry',
      target_id: data.id,
      details: `Logged ${body.hours_spent}h for ${body.kra_category}`
    });

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    console.error('Submit Entry Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded || (decoded.role !== 'manager' && decoded.role !== 'dept_head')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all entries with user details
    let query = supabase
      .from('pgepl_entries')
      .select(`
        *,
        pgepl_users!inner ( name, department )
      `)
      .order('work_date', { ascending: false });

    // If Department Head, filter by their department
    if (decoded.role === 'dept_head') {
      query = query.eq('department', decoded.department);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ entries: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
