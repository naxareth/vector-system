import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/app/(auth)/verify-email/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add useEffect to imports
content = content.replace("import { useState, useRef, Suspense } from 'react';", "import { useState, useRef, Suspense, useEffect } from 'react';")

# Add timer state and effect
timer_logic = """  const [resendMessage, setResendMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;"""

content = content.replace("  const [resendMessage, setResendMessage] = useState('');", timer_logic)

# Reset timer on resend
content = content.replace("setResendMessage('A new code has been sent to your email.');", "setResendMessage('A new code has been sent to your email.');\n      setTimeLeft(300);")

# Update UI for timer and resend
ui_original = """      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Didn&apos;t receive the code?{' '}
          <button onClick={handleResend} type="button" className="text-[#06B4C9] font-semibold hover:underline outline-none">
            Resend
          </button>
        </p>"""

ui_replacement = """      <div className="text-center mt-6">
        <p className="text-sm text-gray-600 mb-2">
          {timeLeft > 0 ? (
            <span>Code expires in <span className="font-semibold text-gray-900">{timeString}</span></span>
          ) : (
            <span className="text-red-500 font-semibold">Code expired</span>
          )}
        </p>
        <p className="text-sm text-gray-600">
          Didn&apos;t receive the code?{' '}
          <button onClick={handleResend} disabled={timeLeft > 0} type="button" className={`font-semibold outline-none transition-colors ${timeLeft > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#06B4C9] hover:underline'}`}>
            Resend Code
          </button>
        </p>"""

content = content.replace(ui_original, ui_replacement)

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
