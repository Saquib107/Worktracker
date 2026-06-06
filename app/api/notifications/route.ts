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
    if (!decoded) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('pgepl_notifications')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ notifications: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await request.json();

    const { error } = await supabase
      .from('pgepl_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', decoded.userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
