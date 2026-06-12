import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded || (decoded.role !== 'manager' && decoded.role !== 'dept_head')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('pgepl_audit_logs')
      .select(`
        *,
        pgepl_users!inner ( name, department )
      `)
      .order('timestamp', { ascending: false })
      .limit(100);

    // If Department Head, filter by their department
    if (decoded.role === 'dept_head') {
      query = query.eq('pgepl_users.department', decoded.department);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ logs: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
