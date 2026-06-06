const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin(email, password) {
  console.log(`Testing login for ${email}...`);
  const { data: user, error } = await supabase
    .from('pgepl_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    console.error('Database Error:', error);
    return;
  }
  
  if (!user) {
    console.error('User not found in DB');
    return;
  }

  console.log('Found user:', user.email);
  
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    console.error('Password mismatch!');
  } else {
    console.log('Login SUCCESS!');
  }
}

testLogin('aditi@pgepl.com', 'changeme123');
