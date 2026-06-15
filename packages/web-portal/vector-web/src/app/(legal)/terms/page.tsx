import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Vector',
  description: 'Terms and conditions governing your use of the Vector platform.',
};

export default function TermsOfServicePage() {
  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5 mb-5">
          <span className="text-xs font-medium text-[#06B4C9]">Legal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
        <p className="text-gray-400 text-sm">Last updated: March 2, 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-4 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_li]:text-gray-600 [&_li]:leading-relaxed">
        {/* 1. Acceptance */}
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Vector (&quot;the Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you may not use the Platform. These Terms constitute a legally binding agreement between you and Vector.
          </p>
          <p>
            Vector is an AI-powered credentialing and career analytics system that combines institutional credential verification with AI-powered skill analytics. These Terms govern your use of all Platform features, including the web portal, API endpoints, and AI engine.
          </p>
        </section>

        {/* 2. Eligibility */}
        <section>
          <h2>2. Eligibility</h2>
          <p>To use Vector, you must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Be at least 16 years of age</li>
            <li>Have a valid email address for account verification</li>
            <li>Provide truthful and accurate registration information</li>
            <li>If registering as a Registrar (institutional account), be authorized by your institution to issue credentials</li>
          </ul>
          <p>
            Accounts are role-based. The Platform supports three roles: <strong>Student</strong>, <strong>Registrar</strong>, and <strong>Super Admin</strong>. Unauthorized assumption of a role is a violation of these Terms.
          </p>
        </section>

        {/* 3. Accounts */}
        <section>
          <h2>3. Account Registration &amp; Security</h2>
          <p>
            You must complete email verification before accessing Platform features. Accounts in a &quot;pending verification&quot; state are restricted to the verification page only.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You must not share your account with others or create multiple accounts</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must immediately notify us of any unauthorized access</li>
          </ul>

        </section>

        {/* 4. Platform Services */}
        <section>
          <h2>4. Platform Services</h2>

          <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">4.1 Credential Verification</h3>
          <p>
            Vector enables institutions (Registrars) to issue verified micro-credentials to students. Credentials are:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Secure:</strong> Credentials are securely stored and verified against institutional records</li>
            <li><strong>Non-transferable:</strong> Credentials are bound to the recipient&apos;s verified identity</li>
            <li><strong>Publicly verifiable:</strong> Anyone can verify credential authenticity through the platform&apos;s verification portal</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">4.2 AI Career Analytics</h3>
          <p>
            The Platform provides AI-powered features including skill extraction from resumes, skill decay predictions, market relevance scoring, and personalized course recommendations. These features:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Are provided for informational and educational purposes only</li>
            <li>Are based on aggregated job market data and should not be the sole basis for career decisions</li>
            <li>May not reflect real-time conditions and are subject to AI model limitations</li>
            <li>Use Google Gemini AI for natural language processing — submitted text is processed in real-time and not stored by the AI provider for model training</li>
          </ul>

          <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">4.3 Credential Verification Reports (CVR)</h3>
          <p>
            Students may generate CVR exports containing their verified credentials and skill analytics for sharing with employers. You are responsible for how you distribute your CVR.
          </p>
        </section>

        {/* 5. User Responsibilities */}
        <section>
          <h2>5. User Responsibilities</h2>
          <p>When using Vector, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate and truthful information in your profile and self-reported skills</li>
            <li>Not misrepresent your qualifications, credentials, or institutional affiliation</li>
            <li>Not attempt to gain unauthorized access to other accounts, roles, or administrative functions</li>
            <li>Not interfere with or disrupt Platform services or APIs</li>
            <li>Not use automated tools (bots, scrapers) to access the Platform beyond approved APIs</li>
            <li>Not submit malicious, fraudulent, or deceptive content through any input field</li>
            <li>Comply with all applicable laws and regulations in your jurisdiction</li>
          </ul>
        </section>

        {/* 6. Registrar Responsibilities */}
        <section>
          <h2>6. Institutional (Registrar) Responsibilities</h2>
          <p>If you use Vector as a Registrar, you additionally agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Only issue credentials that accurately reflect a student&apos;s verified academic achievements</li>
            <li>Ensure proper authorization before issuing credentials to a student</li>
            <li>Take responsibility for the accuracy of credential metadata, skill names, and private notes</li>
            <li>Not issue credentials to individuals who have not completed the relevant coursework</li>
            <li>Comply with your institution&apos;s data governance policies when handling student information</li>
          </ul>
          <p>
            Vector is not liable for credentials issued inaccurately by Registrars. All issuance actions are permanently logged in the audit system.
          </p>
        </section>



        {/* 7. Data Usage & AI Processing */}
        <section>
          <h2>7. Data Usage &amp; AI Processing</h2>
          <p>By using Vector, you acknowledge and agree to the following regarding our data practices:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>AI Processing:</strong> Uploaded credential documents are processed by AI for automated data extraction and analysis.</li>
            <li><strong>Fraud Detection:</strong> AI performs initial fraud pattern detection; however, this is not an absolute verification.</li>
            <li><strong>Human Review:</strong> Extracted data and AI flags are reviewed by a human registrar before final verification is issued.</li>
            <li><strong>Job Matching:</strong> Your profile and credential data may be used for career analytics and job matching if you opt in to these services.</li>
          </ul>
        </section>

        {/* 8. Intellectual Property */}
        <section>
          <h2>8. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform&apos;s software, design, branding, and documentation are the property of Vector</li>
            <li>Your credential data, profile content, and self-reported skills remain your property</li>
            <li>By using the Platform, you grant Vector a non-exclusive license to process and display your data as necessary to provide services</li>
          </ul>
        </section>

        {/* 9. Disclaimers */}
        <section>
          <h2>9. Disclaimers &amp; Limitations</h2>
          <p>
            The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>We do not guarantee the accuracy of AI-generated analytics, skill predictions, or course recommendations</li>
            <li>We do not guarantee uninterrupted or error-free operation of the Platform</li>
            <li>We are not responsible for actions taken by third-party services (Supabase, Google Gemini)</li>
            <li>We are not liable for any decisions made based on Platform data, analytics, or recommendations</li>
          </ul>
          <p>
            To the maximum extent permitted by law, Vector shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.
          </p>
        </section>

        {/* 10. Termination */}
        <section>
          <h2>10. Account Termination</h2>
          <p>We may suspend or terminate your account if:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You violate these Terms or engage in fraudulent activity</li>
            <li>You attempt to circumvent security measures, RBAC controls, or rate limits</li>
            <li>Your account poses a security risk to the Platform or its users</li>
            <li>Required by law or regulatory action</li>
          </ul>
          <p>
            Upon termination, your access to the Platform will be revoked. Your data may be deleted per our <a href="/privacy" className="text-[#06B4C9] hover:underline">Privacy Policy</a>.
          </p>
        </section>

        {/* 11. Modifications */}
        <section>
          <h2>11. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be communicated through Platform notifications at least 14 days before taking effect. Continued use of Vector after the effective date constitutes acceptance of the modified Terms.
          </p>
        </section>

        {/* 12. Governing Law */}
        <section>
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Platform shall be resolved through good-faith negotiation before pursuing formal dispute resolution.
          </p>
        </section>

        {/* 13. Contact */}
        <section>
          <h2>13. Contact</h2>
          <p>For questions about these Terms, contact us at:</p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Email:</strong> <a href="mailto:legal@vector.edu" className="text-[#06B4C9] hover:underline">legal@vector.edu</a></li>
            <li><strong>Platform:</strong> <a href="https://vector.app" className="text-[#06B4C9] hover:underline">vector.app</a></li>
          </ul>
        </section>
      </div>
    </article>
  );
}
