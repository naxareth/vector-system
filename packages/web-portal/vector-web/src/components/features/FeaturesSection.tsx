'use client';
import { useInView } from '@/hooks/useInView';

/* Mini SVG illustrations for each card */
const VerifiedGraphic = () => (
  <div className="relative w-full h-24 mb-4 overflow-hidden rounded-lg bg-gradient-to-br from-[#FFEDD4]/60 to-[#FFEDD4]/10">
    {/* Connecting chain nodes */}
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
      {/* Chain line */}
      <line x1="30" y1="40" x2="170" y2="40" stroke="#F54900" strokeWidth="1" strokeDasharray="4 3" opacity="0.3" className="animate-dash" />
      {/* Nodes */}
      <rect x="20" y="28" width="24" height="24" rx="6" fill="#F54900" fillOpacity="0.08" stroke="#F54900" strokeWidth="1" strokeOpacity="0.3" className="animate-pulse-subtle" />
      <rect x="88" y="28" width="24" height="24" rx="6" fill="#F54900" fillOpacity="0.12" stroke="#F54900" strokeWidth="1" strokeOpacity="0.4" className="animate-pulse-subtle" style={{ animationDelay: '0.5s' }} />
      <rect x="156" y="28" width="24" height="24" rx="6" fill="#F54900" fillOpacity="0.08" stroke="#F54900" strokeWidth="1" strokeOpacity="0.3" className="animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      {/* Check marks inside */}
      <path d="M28 40 L30 42 L36 36" fill="none" stroke="#F54900" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M96 40 L98 42 L104 36" fill="none" stroke="#F54900" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M164 40 L166 42 L172 36" fill="none" stroke="#F54900" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  </div>
);

const AIGraphic = () => (
  <div className="relative w-full h-24 mb-4 overflow-hidden rounded-lg bg-gradient-to-br from-purple-50/80 to-purple-50/20">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
      {/* Neural network nodes */}
      {[30, 30, 30].map((x, i) => (
        <circle key={`l1-${i}`} cx={x} cy={20 + i * 20} r="5" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.4" className="animate-pulse-subtle" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {[100, 100].map((x, i) => (
        <circle key={`l2-${i}`} cx={x} cy={25 + i * 30} r="6" fill="#a855f7" fillOpacity="0.1" stroke="#a855f7" strokeWidth="1" opacity="0.5" className="animate-pulse-subtle" style={{ animationDelay: `${i * 0.4 + 0.2}s` }} />
      ))}
      <circle cx="170" cy="40" r="7" fill="#a855f7" fillOpacity="0.15" stroke="#a855f7" strokeWidth="1.5" opacity="0.6" className="animate-pulse-subtle" style={{ animationDelay: '0.6s' }} />
      {/* Connections */}
      {[20, 40, 60].map((y1, i) => [25, 55].map((y2, j) => (
        <line key={`c1-${i}-${j}`} x1="35" y1={y1} x2="94" y2={y2} stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      )))}
      {[25, 55].map((y1, i) => (
        <line key={`c2-${i}`} x1="106" y1={y1} x2="163" y2="40" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      ))}
      {/* AI sparkle */}
      <text x="166" y="44" fontSize="10" textAnchor="middle" fill="#a855f7" opacity="0.5">✦</text>
    </svg>
  </div>
);

const SecurityGraphic = () => (
  <div className="relative w-full h-24 mb-4 overflow-hidden rounded-lg bg-gradient-to-br from-green-50/80 to-green-50/20">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 80">
      {/* Shield */}
      <path d="M100 10 L130 22 L130 45 C130 60 100 70 100 70 C100 70 70 60 70 45 L70 22 Z" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.25" />
      <path d="M100 16 L124 26 L124 43 C124 55 100 64 100 64 C100 64 76 55 76 43 L76 26 Z" fill="#22c55e" fillOpacity="0.04" />
      {/* Lock icon inside */}
      <rect x="93" y="36" width="14" height="12" rx="2" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.4" />
      <path d="M96 36 V32 C96 28 104 28 104 32 V36" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.4" />
      {/* Encrypted data particles */}
      <text x="45" y="30" fontSize="7" fill="#22c55e" opacity="0.15" className="font-mono animate-float-slow">0x1a...</text>
      <text x="140" y="50" fontSize="7" fill="#22c55e" opacity="0.15" className="font-mono animate-float-medium">AES256</text>
    </svg>
  </div>
);

export default function FeaturesSection() {
  const { ref: headerRef, isInView: headerVisible } = useInView();
  const { ref: grid1Ref, isInView: grid1Visible } = useInView();
  const { ref: grid2Ref, isInView: grid2Visible } = useInView();
  const { ref: grid3Ref, isInView: grid3Visible } = useInView();

  const features = [
    {
      graphic: <VerifiedGraphic />,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Granular Verification',
      description: 'Move beyond generic diplomas. Break academic achievements into fine-grained, verifiable skill badges.',
      tag: 'Verified',
      accent: '#F54900',
    },
    {
      graphic: <AIGraphic />,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Predictive Analytics',
      description: 'Gemini AI analyzes real-time job market data to detect skill decay and deliver personalized re-skilling recommendations.',
      tag: 'AI-Powered',
      accent: '#a855f7',
    },
    {
      graphic: <SecurityGraphic />,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Secure Trust',
      description: 'AES-256 encryption and secure verification eliminate manual background checks with one tamper-proof data point.',
      tag: 'Security',
      accent: '#22c55e',
    },
  ];

  const gridRefs = [grid1Ref, grid2Ref, grid3Ref];
  const gridVisible = [grid1Visible, grid2Visible, grid3Visible];

  return (
    <section id="features" className="py-28 px-6 bg-gray-50/70 relative">
      {/* Subtle top fade */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none" />

      {/* Decorative circles */}
      <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full border border-dashed border-gray-200/60 pointer-events-none animate-spin-very-slow" />
      <div className="absolute bottom-16 left-[5%] w-40 h-40 rounded-full border border-dashed border-gray-200/40 pointer-events-none animate-spin-very-slow-reverse" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#06B4C9]/20 bg-[#06B4C9]/5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B4C9] animate-pulse" />
            <span className="text-xs font-medium text-[#06B4C9]">Core Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Infrastructure for<br />Modern Credentials
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Bridging the gap between academic records and industry demands through three core innovations that redefine trust.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={gridRefs[index]}
              className={`group relative bg-white p-6 rounded-2xl border border-gray-200 hover:border-[${feature.accent}]/30 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-gray-200/50 ${
                gridVisible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#06B4C9]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="relative z-10">
                {/* Mini illustration */}
                {feature.graphic}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: `${feature.accent}15`, color: feature.accent }}>
                    {feature.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest block" style={{ color: feature.accent }}>{feature.tag}</span>
                    <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}