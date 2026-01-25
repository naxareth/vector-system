export default function CTASection() {
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Ready to secure the future of work?
        </h2>
        <p className="text-purple-100 text-lg mb-10">
          Join 500+ institutions issuing verifiable credentials on the Vector network today
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/register"
            className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-50 transition-all shadow-lg"
          >
            Get Started Now
          </a>
          <a
            href="#download"
            className="px-8 py-4 bg-purple-800 hover:bg-purple-900 text-white rounded-lg font-semibold transition-all border border-purple-500"
          >
            Download
          </a>
        </div>
      </div>
    </section>
  );
}
