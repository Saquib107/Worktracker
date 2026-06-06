const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mlcotsudmdsxjvkpwgtn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7hBGw9cHPGbgruzY6mtf-g_ntKnBa_f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('Seeding Manager Database...');

  // 1. Clear existing users
  await supabase.from('pgepl_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 2. Hash password
  const managerHash = await bcrypt.hash('Saquib#777', 10);

  // 3. Create Manager
  const { error: mgrErr } = await supabase.from('pgepl_users').insert({
    name: 'Saquib Rayees',
    email: 'rayeessaquib0022@gmail.com',
    password_hash: managerHash,
    department: 'Admin',
    role: 'manager'
  });

  if (mgrErr) {
    console.error('Manager Error:', mgrErr);
  } else {
    console.log('Seeding complete! Manager inserted. No employees seeded.');
  }
}

seed();
