import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/app/(auth)/login/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add isEmployerFlow
content = content.replace(
    "const isRegistrarFlow = searchParams.get('role') === 'registrar';",
    "const isRegistrarFlow = searchParams.get('role') === 'registrar';\n  const isEmployerFlow = searchParams.get('role') === 'employer';"
)

# Dynamic color update
content = content.replace(
    "const loginBtnColor = isRegistrarFlow ? '#011018' : '#06B4C9';",
    "const loginBtnColor = isRegistrarFlow || isEmployerFlow ? '#011018' : '#06B4C9';"
)

# Role checks
old_role_checks = """      // If on the student login page, prevent registrar accounts from signing in here
      if (!isRegistrarFlow && userData.role === 'registrar') {
        await supabase.auth.signOut();
        setError("This email is registered as a Registrar. Please sign in through the Registrar portal or contact support if this is unexpected.");
        setLoading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }

      if (isRegistrarFlow && userData.role !== 'registrar') {
        await supabase.auth.signOut();
        setError("You are not authorized to sign in here. This portal is for registrars only.");
        setLoading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }"""

new_role_checks = """      // Verify correct login portal for role
      const isStudentFlow = !isRegistrarFlow && !isEmployerFlow;
      
      if (isStudentFlow && userData.role !== 'student' && userData.role !== 'super_admin') {
        await supabase.auth.signOut();
        setError(`This email is registered as a ${userData.role}. Please use the correct login portal.`);
        setLoading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }

      if (isRegistrarFlow && userData.role !== 'registrar') {
        await supabase.auth.signOut();
        setError("You are not authorized to sign in here. This portal is for registrars only.");
        setLoading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }

      if (isEmployerFlow && userData.role !== 'employer') {
        await supabase.auth.signOut();
        setError("You are not authorized to sign in here. This portal is for employers only.");
        setLoading(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }"""

content = content.replace(old_role_checks, new_role_checks)

# Target redirect
old_target = """        if (userData.role === 'registrar') {
          target = '/registrar/dashboard';
        } else if (userData.role === 'super_admin') {
          target = '/admin/dashboard';
        }"""
new_target = """        if (userData.role === 'registrar') {
          target = '/registrar/dashboard';
        } else if (userData.role === 'employer') {
          target = '/employer/dashboard';
        } else if (userData.role === 'super_admin') {
          target = '/admin/dashboard';
        }"""

content = content.replace(old_target, new_target)

# MFA Redirect
old_mfa = """              if (pendingRole === 'registrar') target = '/registrar/dashboard';
              if (pendingRole === 'super_admin') target = '/admin/dashboard';"""
new_mfa = """              if (pendingRole === 'registrar') target = '/registrar/dashboard';
              if (pendingRole === 'employer') target = '/employer/dashboard';
              if (pendingRole === 'super_admin') target = '/admin/dashboard';"""
content = content.replace(old_mfa, new_mfa)

# Link text
old_link = """            {(() => {
              const roleParam = searchParams.get('role');
              const href = roleParam === 'registrar' ? '/registrar-register' : '/register';
              return (
                <Link href={href} className="font-semibold text-gray-900 hover:underline">
                  Create an account
                </Link>
              );
            })()}"""
new_link = """            {(() => {
              const roleParam = searchParams.get('role');
              const href = roleParam === 'registrar' ? '/registrar-register' : roleParam === 'employer' ? '/employer-register' : '/register';
              return (
                <Link href={href} className="font-semibold text-gray-900 hover:underline">
                  Create an account
                </Link>
              );
            })()}"""
content = content.replace(old_link, new_link)

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
