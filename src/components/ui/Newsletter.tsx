import { useState, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

interface NewsletterProps {
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
  buttonColor?: string;
  focusRingColor?: string;
}

export default function Newsletter({
  title = "Stay in the JavaScript Loop! ✨",
  description = "Get awesome JS content, event alerts & community news delivered straight to your inbox!",
  buttonText = "Join the JS Community",
  successMessage = "🎉 Woohoo! You're in! Get ready for some JavaScript awesomeness in your inbox!",
  buttonColor = "bg-blue-700 hover:bg-blue-600 text-white",
  focusRingColor = "focus:ring-blue-400"
}: NewsletterProps) {


  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address so we can send you the JS goodness!');
      return;
    }

    // First name validation
    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }

    setIsLoading(true);

    try {
      // Connect to EmailOctopus API
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setSubmitted(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleFirstNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
    if (error) setError('');
  };

  const handleLastNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
    if (error) setError('');
  };


  return (
    <div className="bg-gray-50 rounded-lg p-6 shadow-inner border border-gray-200">
      <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-700 mb-4">
        {description}
      </p>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-green-600 bg-green-50 p-4 rounded-md border border-green-200 flex items-start"
        >
          <Sparkles className="mr-2 flex-shrink-0 mt-1" size={18} />
          <p>{successMessage}</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <div>
              <input
                type="text"
                value={firstName}
                onChange={handleFirstNameChange}
                placeholder="First Name"
                className={`w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 ${focusRingColor}`}
                aria-label="First name"
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={lastName}
                onChange={handleLastNameChange}
                placeholder="Last Name (optional)"
                className={`w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 ${focusRingColor}`}
                aria-label="Last name"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your.awesome.email@example.com"
                className={`w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 ${focusRingColor}`}
                aria-label="Email address"
                disabled={isLoading}
                required
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm mt-1 ml-1"
                >
                  {error}
                </motion.p>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className={`${buttonColor} px-4 py-2 rounded-md font-medium flex items-center justify-center shadow-sm`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Subscribing</span>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                <>
                  {buttonText} <Send size={16} className="ml-2" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      )}

      <p className="text-xs text-gray-500 mt-4">
        We promise to only send you the coolest JavaScript content! No spam, just pure coding goodness. You can unsubscribe anytime. 💛
      </p>
    </div>
  );
}