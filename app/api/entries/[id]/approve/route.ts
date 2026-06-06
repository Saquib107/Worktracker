import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const token = authHeader.split(' ')[1];
    const decoded: any = verifyToken(token);
    if (!decoded || decoded.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { status } = await request.json();
    const { id } = await params;

    // Update status
    const { error: updateErr } = await supabase
      .from('pgepl_entries')
      .update({ approval_status: status })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Create Audit Log
    await supabase.from('pgepl_audit_logs').insert({
      user_id: decoded.userId,
      action: `Changed approval status to ${status}`,
      target_type: 'entry',
      target_id: id,
      details: `Manager ${decoded.name} set status to ${status}`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
