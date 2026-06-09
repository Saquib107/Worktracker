import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Head HR access required' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (!decoded || decoded.role !== 'manager') { // 'manager' is the DB role for Head HR
      return NextResponse.json({ error: 'Forbidden: Only Head HR can create accounts' }, { status: 403 });
    }

    const { name, email, password, department, role } = await request.json();

    if (!name || !email || !password || !department) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('pgepl_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const { data: user, error } = await supabase
      .from('pgepl_users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        department,
        role: role || 'employee'
      })
      .select('*')
      .single();

    if (error || !user) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Failed to create account. Check database permissions.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
