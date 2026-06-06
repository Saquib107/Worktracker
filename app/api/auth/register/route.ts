import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, password, department } = await request.json();

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
        role: 'employee'
      })
      .select('*')
      .single();

    if (error || !user) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Failed to create account. Check database permissions.' }, { status: 500 });
    }

    // Create JWT payload
    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
    };

    const token = signToken(payload);

    return NextResponse.json({
      token,
      user: payload
    });

  } catch (err: any) {
    console.error('Register Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
