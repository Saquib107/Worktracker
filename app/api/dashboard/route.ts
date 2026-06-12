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

    // Base query for employees
    let userQuery = supabase.from('pgepl_users').select('id, name, department, role', { count: 'exact' });
    
    // Filter out Head HR
    userQuery = userQuery.eq('role', 'employee');

    // If Department Head, filter strictly by their department
    if (decoded.role === 'dept_head') {
      userQuery = userQuery.eq('department', decoded.department);
    }

    const { data: users, count: employeeCount, error } = await userQuery;

    if (error) throw error;

    return NextResponse.json({ 
      employeeCount,
      users
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
