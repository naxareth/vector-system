import { redirect } from 'next/navigation';

export default function RegistrarLoginPage() {
  // Redirect to the existing login page with registrar role preselected.
  redirect('/login?role=registrar');
}
