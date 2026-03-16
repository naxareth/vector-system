
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function diagnostic() {
  try {
    const env = fs.readFileSync('c:/vector-system/packages/web-portal/vector-web/.env', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].replace(/\"/g, '').trim();
    const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].replace(/\"/g, '').trim();
    
    console.log('Supabase URL:', url);
    const supabase = createClient(url, key);

    // 1. Check if column exists by selecting it
    console.log('\n--- Checking Column ---');
    const { data: selectData, error: selectError } = await supabase
      .from('verified_credentials')
      .select('id, revoked')
      .limit(1);
    
    if (selectError) {
      console.log('Select Error:', selectError.message);
    } else {
      console.log('Select Success! Sample row:', selectData[0]);
    }

    // 2. Try an update and see the detailed error
    if (selectData && selectData.length > 0) {
      console.log('\n--- Testing Update ---');
      const targetId = selectData[0].id;
      const { data: updateData, error: updateError, status, statusText } = await supabase
        .from('verified_credentials')
        .update({ revoked: true })
        .eq('id', targetId)
        .select();
      
      if (updateError) {
        console.log('Update Error:', updateError);
      } else {
        console.log('Update Success! Status:', status, statusText);
        console.log('Updated Row:', updateData);
      }
    }

  } catch (err) {
    console.error('Diagnostic Script Failed:', err.message);
  }
}

diagnostic();
