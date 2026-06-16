import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/middleware.ts"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add /employer to PROTECTED_PATHS
content = content.replace(
    "const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin'];",
    "const PROTECTED_PATHS = ['/registrar', '/student', '/admin', '/api/admin', '/employer'];"
)

# 2. Add employer to AUTH_PATHS
content = content.replace(
    "'/student-login',",
    "'/student-login',\n  '/employer-register',\n  '/employer-login',"
)

# 3. Update targetPath in RULE 2 and RULE 3
old_target_path = "const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : '/student/dashboard';"
new_target_path = "const targetPath = role === 'super_admin' ? '/admin/dashboard' : role === 'registrar' ? '/registrar/dashboard' : role === 'employer' ? '/employer/dashboard' : '/student/dashboard';"
content = content.replace(old_target_path, new_target_path)

# 4. Add RBAC logic for /employer
rbac_addition = """    if (pathname.startsWith('/registrar')) {
      if (role === 'registrar' || role === 'super_admin') {
        return logAndReturn(response);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        return logAndReturn(NextResponse.redirect(`${baseUrl}/student/dashboard${url.search}`));
      }
    }

    if (pathname.startsWith('/employer')) {
      if (role === 'employer' || role === 'super_admin') {
        return logAndReturn(response);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        return logAndReturn(NextResponse.redirect(`${baseUrl}/student/dashboard${url.search}`));
      }
    }"""

content = content.replace(
    """    if (pathname.startsWith('/registrar')) {
      if (role === 'registrar' || role === 'super_admin') {
        return logAndReturn(response);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
        return logAndReturn(NextResponse.redirect(`${baseUrl}/student/dashboard${url.search}`));
      }
    }""",
    rbac_addition
)

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
