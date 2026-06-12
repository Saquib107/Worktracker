import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('pgepl_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Identify Department Heads without altering database schema constraints
    const deptHeadEmails = ['ritesh@pgepl.com'];
    let finalRole = user.role;
    if (deptHeadEmails.includes(user.email.toLowerCase())) {
      finalRole = 'dept_head';
    }

    // Create JWT payload
    const payload = {
      userId: user.id,
      name: user.name,
      role: finalRole,
      department: user.department,
    };

    const token = signToken(payload);

    return NextResponse.json({
      token,
      user: payload
    });

  } catch (err: any) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
