const { serviceSupabase } = require('./supabaseClients');

async function check() {
  console.log("Checking Supabase connection...");
  try {
    const { data: profileData, error: profileErr } = await serviceSupabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profileErr) {
      console.log('Error querying user_profiles:', profileErr.message);
      process.exit(1);
    }
    
    console.log("✅ Successfully queried 'user_profiles' table.");
    process.exit(0);

  } catch (e) {
    console.log("Error connecting:", e.message);
    process.exit(1);
  }
}

check();
