export default function SuccessState() {
  return (
    <div className="text-center py-12 animate-fade-in-up">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 md:p-12 max-w-xl mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Thank You for Your Submission!</h3>
        <p className="text-gray-600 mb-8 leading-relaxed">
          We&apos;ve received your talk proposal and will review it shortly. Our team will contact you
          within the next 2 weeks regarding the status of your submission.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Return to Homepage
          </a>
          <a
            href="/events"
            className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            View Upcoming Events
          </a>
        </div>
      </div>
    </div>
  );
}
