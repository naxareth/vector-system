import { redirect } from 'next/navigation';

export default function StudentLoginPage() {
  // Redirect to the shared login page with student role preselected.
  redirect('/login?role=student');
}
