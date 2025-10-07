import Link from 'next/link';
import { useState } from 'react';

export default function StickyActions() {
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [codePhrase, setCodePhrase] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const generateCodePhrase = () => {
    const phrases = [
      "Do you guys have matcha?",
      "Where can I find the elevator?",
      "Do you organize Rust meetups too?",
      "What food options do you have?",
      "Is there a quiet room available?",
      "Do you have any vegan snacks?",
      "Can I get some sparkling water?",
      "Is there a coat check area?"
    ];

    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handlePanicClick = () => {
    setCodePhrase(generateCodePhrase());
    setShowPanicModal(true);
    setIsSuccess(false);
  };

  const handleConfirmPanic = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Safety Alert',
          message: `*ANONYMOUS SAFETY ALERT TRIGGERED*\n\nAn attendee needs immediate assistance.\n\n*Code Phrase:* *"${codePhrase}"*\n\nPlease look for someone who approaches you with this code phrase and handle the situation discreetly.`,
          type: 'other',
          priority: 'high',
          slackChannel: '#zurichjs-safety',
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        alert('Failed to send alert. Please approach an organizer directly.');
      }
    } catch (error) {
      console.error('Error sending panic alert:', error);
      alert('Failed to send alert. Please approach an organizer directly.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl z-50">
        <div className="px-4 py-3">
          {/* Mobile: Single row of 2 buttons */}
          <div className="md:hidden">
            <div className="flex gap-3">
              <button
                onClick={handlePanicClick}
                className="flex-1 min-h-[52px] bg-red-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg border-2 border-red-600"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <span>Need Help?</span>
                </span>
              </button>
              <Link
                href="/events"
                className="flex-1 min-h-[52px] bg-gray-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center active:scale-[0.98] transition-transform duration-200 touch-manipulation shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span>Upcoming Events</span>
                </span>
              </Link>
            </div>
          </div>

          {/* Desktop: Single row of 2 buttons */}
          <div className="hidden md:flex gap-4 max-w-2xl mx-auto">
            <button
              onClick={handlePanicClick}
              className="flex-1 min-h-[52px] bg-red-500 text-white rounded-2xl font-bold text-base flex items-center justify-center hover:bg-red-600 transition-colors duration-200 shadow-lg border-2 border-red-600"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                Need Help?
              </span>
            </button>
            <Link
              href="/events"
              className="flex-1 min-h-[52px] bg-gray-600 text-white rounded-2xl font-bold text-base flex items-center justify-center hover:bg-gray-500 transition-colors duration-200 shadow-lg"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                Upcoming Events
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Panic Modal */}
      {showPanicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => !isSending && !isSuccess && setShowPanicModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {!isSuccess ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-3xl">🚨</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Safety & Support</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      This button is for urgent situations where you:
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-4 ml-12">
                  <li className="text-sm text-gray-700">• Feel unsafe or threatened</li>
                  <li className="text-sm text-gray-700">• Witness a code of conduct violation</li>
                  <li className="text-sm text-gray-700">• Need medical assistance</li>
                </ul>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-800 font-medium mb-2">
                    🔒 Your privacy is protected
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    An anonymous alert will be sent to organizers. You&apos;ll receive a unique code phrase to identify yourself privately to an organizer.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 font-bold mb-1">
                    Look for organizers wearing yellow ZurichJS t-shirts:
                  </p>
                  <p className="text-sm text-red-700">
                    Faris, Nadja, or Bogdan
                  </p>
                </div>

                <p className="text-xs text-gray-500 italic mb-6">
                  ⚠️ Abuse of this feature will not be tolerated and may result in removal from the event.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPanicModal(false)}
                    disabled={isSending}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPanic}
                    disabled={isSending}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Confirm & Send Alert'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Alert Sent</h3>
                  <p className="text-sm text-gray-600">
                    Organizers have been notified
                  </p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-4">
                  <p className="text-sm text-gray-700 font-medium mb-3 text-center">
                    Your unique code phrase:
                  </p>
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-400">
                    <p className="text-2xl font-black text-blue-600 text-center tracking-wide">
                      {codePhrase}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-800 font-bold mb-2">
                    📍 Next Steps:
                  </p>
                  <ol className="text-sm text-gray-700 space-y-1 ml-4">
                    <li>1. Look for an organizer in a yellow ZurichJS t-shirt</li>
                    <li>2. Approach them and say: <strong>&ldquo;{codePhrase}&rdquo;</strong></li>
                    <li>3. They will know to have a private conversation with you</li>
                  </ol>
                </div>

                <button
                  onClick={() => setShowPanicModal(false)}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}