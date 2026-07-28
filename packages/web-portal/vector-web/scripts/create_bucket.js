const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jpipnqcnsornqwxbyvge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaXBucWNuc29ybnF3eGJ5dmdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg5Njc1NCwiZXhwIjoyMDgxNDcyNzU0fQ.u4xhCBO5Vf96qYFSrAOQxvgRr54EpBIMN_175TnnjaA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('credential-uploads', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    fileSizeLimit: 10485760 // 10MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists.');
    } else {
      console.error('Failed to create bucket:', error.message);
    }
  } else {
    console.log('Bucket "credential-uploads" created successfully!', data);
  }
}

createBucket();
