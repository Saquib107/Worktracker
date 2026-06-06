const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mlcotsudmdsxjvkpwgtn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7hBGw9cHPGbgruzY6mtf-g_ntKnBa_f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('email, role').limit(5);
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('Users in DB:', data);
  }
}

check();
