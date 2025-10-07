import Link from 'next/link';
import { useState } from 'react';

import { Event } from '@/sanity/queries';

interface QuickActionsProps {
  event: Event;
}

interface Action {
  label: string;
  href: string;
  icon: string;
  color: string;
  external?: boolean;
}

export default function QuickActions({ event }: QuickActionsProps) {
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [codePhrase, setCodePhrase] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const generateCodePhrase = () => {
    const adjectives = ['Swift', 'Bright', 'Silent', 'Golden', 'Silver', 'Cosmic', 'Crystal', 'Electric', 'Mystic', 'Noble'];
    const nouns = ['Falcon', 'Phoenix', 'Dragon', 'Eagle', 'Tiger', 'Wolf', 'Lion', 'Bear', 'Hawk', 'Owl'];
    const numbers = Math.floor(Math.random() * 99) + 1;
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${numbers}`;
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
          title: '🚨 URGENT: Safety Alert',
          message: `Anonymous safety alert triggered at ${event.title}. Code phrase: "${codePhrase}". An attendee needs immediate assistance. Please look for someone who approaches you with this code phrase.`,
          type: 'other',
          priority: 'high',
          slackChannel: '#organizers',
          eventData: {
            eventId: event.id,
            eventTitle: event.title,
          }
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

  const actions: Action[] = [
    {
      label: "Rate Talks",
      href: `/events/${event.id}?feedback=true`,
      icon: "⭐",
      color: "bg-gradient-to-br from-js to-js-dark"
    },
    {
      label: "Event Info",
      href: `/events/${event.id}`,
      icon: "📍",
      color: "bg-gradient-to-br from-purple-500 to-pink-500"
    },
    {
      label: "Post on LinkedIn",
      href: `https://www.linkedin.com/feed/?linkOrigin=LI_BADGE&shareActive=true&shareUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://zurichjs.com/events')}&text=${encodeURIComponent(`I had a great time at ZurichJS! Just attended "${event.title}" - what an amazing JavaScript community event! Thanks to all the speakers and organizers. 🚀 #ZurichJS #JavaScript #Community`)}`,
      icon: "💼",
      color: "bg-gradient-to-br from-blue-700 to-blue-800",
      external: true
    },
    {
      label: "Buy T-shirt",
      href: "/tshirt",
      icon: "👕",
      color: "bg-gradient-to-br from-green-500 to-emerald-600"
    },
    {
      label: "Buy us a Coffee",
      href: "/buy-us-a-coffee",
      icon: "☕",
      color: "bg-gradient-to-br from-amber-500 to-orange-600"
    }
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-gray-900">Actions</h2>

      <div className="grid gap-3 sm:gap-2">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex items-center gap-4 sm:gap-3 p-4 sm:p-3 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl min-h-[60px] touch-manipulation"
          >
            <div className={`w-12 h-12 sm:w-10 sm:h-10 rounded-xl ${action.color} flex items-center justify-center text-white text-xl sm:text-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-base sm:text-sm leading-tight">
                {action.label}
              </div>
            </div>
            <div className="text-gray-400 group-hover:text-zurich group-hover:translate-x-1 transition-all duration-200 text-lg sm:text-base flex-shrink-0">
              →
            </div>
          </Link>
        ))}

        {/* Panic Button */}
        <button
          onClick={handlePanicClick}
          className="group flex items-center gap-4 sm:gap-3 p-4 sm:p-3 bg-white rounded-2xl border-2 border-red-500 hover:border-red-600 transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl min-h-[60px] touch-manipulation"
        >
          <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl sm:text-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
            🚨
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-bold text-red-600 text-base sm:text-sm leading-tight">
              Need Help?
            </div>
            <div className="text-xs text-red-500 mt-0.5">
              Safety • Code of Conduct • Medical
            </div>
          </div>
          <div className="text-red-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all duration-200 text-lg sm:text-base flex-shrink-0">
            →
          </div>
        </button>
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
    </div>
  );
}