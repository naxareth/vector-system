import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateText } from '@/lib/ai-provider';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { submission_id } = body;

  if (!submission_id) {
    return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 });
  }

  const submission = await prisma.credential_submissions.findUnique({
    where: { id: submission_id },
  });

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Extract filePath from public URL if possible, otherwise use the URL directly
  // The filePath was user.id/uuid.ext
  // Since we don't have the exact path stored, we can extract it from the URL
  // It's usually like /storage/v1/object/public/credential-uploads/{path}
  const urlParts = submission.file_url.split('credential-uploads/');
  const filePath = urlParts.length > 1 ? urlParts[1] : submission.file_url;

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('credential-uploads')
    .download(filePath);

  if (downloadError || !fileData) {
    console.error('Download error:', downloadError);
    return NextResponse.json({ error: 'Failed to download file for extraction' }, { status: 500 });
  }

  let documentText = '';
  if (submission.file_type === 'application/pdf') {
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    try {
      const pdfParseLib = (await import('pdf-parse')).default || await import('pdf-parse');
      const pdfData = await pdfParseLib(buffer);
      documentText = pdfData.text;
    } catch (e) {
      console.error('PDF Parse Error:', e);
      return NextResponse.json({ error: 'Failed to parse PDF file' }, { status: 500 });
    }
  } else {
    // For images, we would ideally use a Vision model. For now, since `generateText` doesn't support images directly,
    // we'll just indicate it's an image.
    documentText = "[IMAGE UPLOADED: Vision extraction not fully implemented yet in this route. Proceeding with dummy data extraction for images.]";
  }

  const prompt = `
You are a credential verification assistant. Analyze this document text and extract structured data.

DOCUMENT TEXT:
${documentText}

Return ONLY valid JSON with two objects:

{
  "extracted": {
    "institution_name": "string or null",
    "credential_type": "diploma | certificate | license | transcript | other",
    "field_of_study": "string or null",
    "date_issued": "YYYY-MM-DD or null",
    "student_name": "string or null",
    "credential_number": "string or null",
    "skills": ["skill1", "skill2"]
  },
  "flags": {
    "score": 0.0, // A float between 0.0 to 1.0
    "issues": [
      { "type": "formatting | date | institution | content", "description": "what's suspicious", "severity": "low | medium | high" }
    ]
  }
}

Flag suspicious patterns: inconsistent dates, unknown institutions, formatting anomalies, generic templates.
If the document looks legitimate, return score 0.0 with empty issues array.
`;

  try {
    const aiResponseText = await generateText(prompt);
    
    // Parse the JSON. Clean markdown fences if any.
    let jsonStr = aiResponseText.trim();
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (jsonStr.startsWith('\`\`\`')) {
      jsonStr = jsonStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const aiData = JSON.parse(jsonStr);

    const updated = await prisma.credential_submissions.update({
      where: { id: submission.id },
      data: {
        extracted_data: aiData.extracted,
        fraud_flags: aiData.flags.issues,
        fraud_score: aiData.flags.score,
        status: 'ai_reviewed'
      }
    });

    return NextResponse.json({
      extracted_data: updated.extracted_data,
      fraud_flags: updated.fraud_flags,
      fraud_score: updated.fraud_score,
    });
  } catch (error) {
    console.error('AI Extraction Error:', error);
    return NextResponse.json({ error: 'AI Extraction failed' }, { status: 500 });
  }
}
