export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-5xl w-full mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-14 space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-sm mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Welcome to VECTOR
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto font-medium">
            The secure skills verification platform for verified
            academic achievements.
          </p>
        </div>

        {/* Split Options Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Option A: Student Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Student Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Log in to view, manage, and share your
              verified credentials securely.
            </p>

            <button
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all duration-200 flex items-center justify-center gap-2 group-hover:gap-3"
              aria-label="Sign In for Student Access"
            >
              Sign In
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Option B: Registrar Access */}
          <div className="group relative bg-white rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col items-center text-center h-full">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-400 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Registrar Access
            </h2>
            <p className="text-gray-600 mb-8 flex-grow">
              Login with your institutional credentials to issue and
              manage verified student skills.
            </p>

            <button
              className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Login with Email for Registrar Access"
            >
              Login with Email
            </button>
          </div>
        </div>

        {/* Footer / Trust Indicators */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Secured with Latest Encryption Technology
          </p>
        </div>
      </div>
    </main>
  );
}
