import { redirect } from 'next/navigation';

export default function EmployerLoginPage() {
  // Redirect to the existing login page with employer role preselected.
  redirect('/login?role=employer');
}
