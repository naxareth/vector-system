import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Course {
  id: string;
  courseTitle: string;
  courseName?: string;
  provider?: string;
  link?: string;
  relevanceScore: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch user profile to get their student ID
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('student_id, wallet_address')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userProfile) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const identifier = userProfile.student_id || userId;

    // Call the analyze API to get fresh AI recommendations (same as dashboard does)
    const analyzeResponse = await fetch(
      new URL('/api/analyze', new URL(request.url).origin),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: identifier,
          resumeText: '',
          skillsOverride: []
        })
      }
    );

    if (!analyzeResponse.ok) {
      console.error('Failed to fetch analysis data:', analyzeResponse.statusText);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    const analysisData = await analyzeResponse.json();

    if (!analysisData?.data?.recommendations) {
      return NextResponse.json({ courses: [] });
    }

    const recommendations = analysisData.data.recommendations;
    const courses: Course[] = recommendations
      .map((rec: { courseTitle?: string; courseName?: string; provider?: string; link?: string; relevanceScore?: number }, index: number) => ({
        id: `course-${index}`,
        courseTitle: rec.courseTitle || rec.courseName || 'Course',
        courseName: rec.courseName,
        provider: rec.provider,
        link: rec.link,
        relevanceScore: rec.relevanceScore || 80,
      }));

    // Filter courses based on search query
    const filteredCourses = query
      ? courses.filter(course =>
          course.courseTitle.toLowerCase().includes(query) ||
          (course.provider?.toLowerCase().includes(query) ?? false) ||
          (course.courseName?.toLowerCase().includes(query) ?? false)
        )
      : courses;

    return NextResponse.json({ courses: filteredCourses });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
