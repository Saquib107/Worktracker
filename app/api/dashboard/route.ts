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
    if (!decoded || decoded.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch total active employees
    const { count: employeeCount, error: err1 } = await supabase
      .from('pgepl_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee');
      
    if (err1) throw err1;

    // We can just rely on the GET /api/entries for all entries and process it on the client side,
    // or we can also return users here. Let's return all users for the Employees tab.
    const { data: users, error: err2 } = await supabase
      .from('pgepl_users')
      .select('id, name, department, role')
      .eq('role', 'employee');

    if (err2) throw err2;

    return NextResponse.json({ 
      employeeCount,
      users
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
