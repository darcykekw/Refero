import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.trim().replace(/^['"](.*)['"]$/, '$1');
    env[match[1]] = val;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const tables = ['colleges', 'programs', 'tags', 'theses', 'thesis_tags'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
    if (error) {
      console.log(`Table [${table}]: Error ->`, error.message);
    } else {
      console.log(`Table [${table}]: ${data ? data.length : 0} rows (total count: ${count})`);
      if (data && data.length > 0) {
        console.log(`  Sample ${table}:`, JSON.stringify(data.slice(0, 2), null, 2));
      }
    }
  }

  // Users
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.log('Users: Error ->', userError.message);
  } else {
    console.log(`Users: ${userData.users.length} users`);
    for (const u of userData.users) {
      console.log(`  - ${u.email} (id: ${u.id})`);
    }
  }

  // Storage
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.log('Storage Buckets: Error ->', bucketError.message);
  } else {
    console.log('Buckets:', buckets.map(b => b.name));
    for (const b of buckets) {
      const { data: files, error: fileError } = await supabase.storage.from(b.name).list();
      console.log(`  Bucket [${b.name}] root:`, files ? files.map(f => f.name) : fileError);
    }
  }
}

main().catch(console.error);
