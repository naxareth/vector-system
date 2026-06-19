import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security — Vector',
  description: 'Learn about the security measures protecting the Vector platform and your data.',
};

export default function SecurityPage() {
  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5 mb-5">
          <span className="text-xs font-medium text-[#06B4C9]">Security</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Security</h1>
        <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
          Vector is designed with enterprise-grade security at every layer — from encrypted data storage to institution-anchored verification. Here&apos;s how we protect your data.
        </p>
      </div>

      {/* Security Feature Cards */}
      <div className="grid sm:grid-cols-2 gap-5 mb-16">
        {[
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ),
            title: 'AES-256 Encryption',
            description: 'Sensitive fields like private instructor notes are encrypted at rest using AES-256 before being stored in the database.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
            title: 'Role-Based Access Control',
            description: 'Strict RBAC enforcement via server-side middleware. Students, Registrars, and Admins each have isolated access scopes.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            ),
            title: 'Immutable Audit Logs',
            description: 'Every administrative action — role changes, credential issuance, user verification — is permanently logged with actor, target, and metadata.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ),
            title: 'Input Validation (Zod)',
            description: 'All API endpoints validate request bodies using Zod schemas before processing, preventing injection attacks and malformed data.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            title: 'Rate Limiting',
            description: 'IP-based rate limiting on sensitive endpoints prevents brute-force attacks and API abuse. Limits reset automatically over time.',
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
            title: 'Email Verification',
            description: 'All accounts require time-limited email verification codes before activation. Unverified users are restricted from accessing platform features.',
          },
        ].map((feature, i) => (
          <div key={i} className="p-6 rounded-2xl border border-gray-200 bg-gray-50/50 hover:border-[#06B4C9]/20 transition-colors">
            <div className="w-10 h-10 bg-[#06B4C9]/10 rounded-xl flex items-center justify-center mb-4 text-[#06B4C9]">
              {feature.icon}
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm">{feature.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Detailed Sections */}
      <div className="prose prose-gray max-w-none space-y-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-4 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_li]:leading-relaxed">
        {/* Authentication */}
        <section>
          <h2>Authentication &amp; Session Management</h2>
          <p>
            Vector uses Supabase for authentication, which provides:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Server-side session validation:</strong> Every request to protected routes is verified server-side through middleware — client-side tokens alone cannot grant access</li>
            <li><strong>Secure cookie management:</strong> Session tokens are stored in HTTP-only, secure cookies with proper SameSite attributes</li>
            <li><strong>Automatic session refresh:</strong> Sessions are refreshed server-side to prevent unnecessary re-authentication</li>
            <li><strong>Path-based protection:</strong> Protected paths (<code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/student</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/registrar</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/admin</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/api/admin</code>) are enforced at the middleware level before any page or API handler executes</li>
          </ul>
        </section>

        {/* RBAC */}
        <section>
          <h2>Role-Based Access Control (RBAC)</h2>
          <p>
            Access control is enforced through a layered middleware system:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Students</strong> can only access <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/student/*</code> routes and their own credential data</li>
            <li><strong>Registrars</strong> can access <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/registrar/*</code> routes and issue credentials to verified students</li>
            <li><strong>Super Admins</strong> can access <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/admin/*</code> routes, manage users, and view audit logs</li>
            <li>Role checks happen server-side on every navigation — a student attempting to access <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/admin/dashboard</code> is automatically redirected</li>
          </ul>
        </section>

        {/* Encryption */}
        <section>
          <h2>Encryption</h2>
          <p>Sensitive data is protected through multiple encryption layers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>At-rest encryption:</strong> Fields such as private instructor notes on credentials are encrypted using AES-256 (CryptoJS) with a server-side encryption key before being written to the database</li>
            <li><strong>Fail-secure design:</strong> If the encryption key is missing from environment variables, the application refuses to start entirely, preventing unencrypted data from being stored</li>
            <li><strong>Database security:</strong> PostgreSQL database is hosted on Supabase with connection-level encryption (SSL/TLS)</li>
            <li><strong>Transport encryption:</strong> All data in transit is encrypted via HTTPS/TLS</li>
          </ul>
        </section>



        {/* Monitoring */}
        <section>
          <h2>Monitoring &amp; Incident Response</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>System traffic logging:</strong> Every HTTP request is logged with method, path, status code, response time, IP address, and user agent for anomaly detection</li>
            <li><strong>Audit trail:</strong> All credential issuance, role changes, and administrative actions are recorded in an immutable audit log with full metadata</li>
            <li><strong>Bot protection:</strong> Cloudflare Turnstile is integrated on authentication forms to prevent automated attacks</li>
            <li><strong>Notification system:</strong> Users receive real-time notifications for security-relevant events like credential issuance and account changes</li>
          </ul>
        </section>

        {/* Responsible Disclosure */}
        <section>
          <h2>Responsible Disclosure</h2>
          <p>
            We take security vulnerabilities seriously. If you discover a potential security issue, please report it responsibly:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email your findings to <a href="mailto:security@vector.edu" className="text-[#06B4C9] hover:underline">security@vector.edu</a></li>
            <li>Include a detailed description of the vulnerability and steps to reproduce</li>
            <li>Do not publicly disclose the vulnerability before we have had a chance to address it</li>
            <li>Do not access or modify other users&apos; data during your testing</li>
          </ul>
          <p>
            We aim to acknowledge reports within 48 hours and provide a resolution timeline within 5 business days.
          </p>
        </section>
      </div>
    </article>
  );
}
