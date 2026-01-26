export default function WorkflowSection() {
  const steps = [
    {
      number: '01',
      title: 'Issue Credential',
      description: 'Institutions issue cryptographically-signed credentials upon course completion.',
    },
    {
      number: '02',
      title: 'Verify on Blockchain',
      description: 'Credentials are anchored to the Polygon network, creating an immutable record.',
    },
    {
      number: '03',
      title: 'Analyze & Share',
      description: "Student's data verifies CVs while AI coaches skill relevance in real-time.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full mb-4">
              Workflow
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From Classroom to Career in Three Steps
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Seamlessly integrate verification into your existing learning management systems.
            </p>

            {/* Steps */}
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Mockup */}
          <div className="lg:pl-8">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg"></div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">Issuer Credential</div>
                      <div className="text-xs text-gray-500">NGCO - Reg. 1</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Student</span>
                    <span className="font-mono text-xs text-gray-900">Generald, student, oracle</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">E-credential (Total)</span>
                    <span className="font-medium text-gray-900">Salman, Jaan, STUDENT (ISSUED)</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="flex-1 text-right">
                    <span className="text-xs text-gray-400">verification processes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
