import { useState, FormEvent } from 'react';

export default function VereinInquiry() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/verein-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🇨🇭</span>
          <h2 className="text-lg font-bold text-gray-900">
            ZurichJS is now a Verein!
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          We are officially registered as a Swiss Verein (association). Interested in becoming a member or learning more? Send us an inquiry!
        </p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-green-800 font-semibold">Inquiry sent!</p>
          <p className="text-green-600 text-sm mt-1">
            We&apos;ll get back to you soon.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setName('');
              setEmail('');
              setMessage('');
            }}
            className="mt-3 text-sm text-green-700 underline"
          >
            Send another inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="verein-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="verein-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="verein-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="verein-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="verein-message" className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="verein-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors resize-none"
              placeholder="Tell us about your interest..."
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white font-bold py-4 px-8 rounded-2xl hover:bg-black/90 transition-colors duration-200 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </form>
      )}
    </div>
  );
}
