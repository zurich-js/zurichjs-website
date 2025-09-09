import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coffee, Heart } from 'lucide-react';
import Head from 'next/head';
import { useState } from 'react';

import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

interface Reward {
  type: 'workshop_50_off' | 'free_tshirt' | 'sticker_pack' | 'keychain' | 'none';
  title: string;
  description: string;
  icon: string;
}

const REWARDS: Reward[] = [
  {
    type: 'workshop_50_off',
    title: '🎓 50% Off Workshop!',
    description: 'Amazing! Get 50% off your next ZurichJS workshop ticket.',
    icon: '🎫'
  },
  {
    type: 'free_tshirt',
    title: '👕 Free ZurichJS T-Shirt!',
    description: 'Awesome! You won a free ZurichJS t-shirt. We\'ll send it your way!',
    icon: '👕'
  },
  {
    type: 'sticker_pack',
    title: '🎉 Sticker Pack!',
    description: 'Sweet! You won a ZurichJS sticker pack. Perfect for your laptop!',
    icon: '🎁'
  },
  {
    type: 'keychain',
    title: '🔑 ZurichJS Keychain!',
    description: 'Nice! You won a ZurichJS keychain. Carry us everywhere!',
    icon: '🔑'
  }
];

export default function DonatePage() {
  const [amount, setAmount] = useState<string>('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };
    
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      
      const particleCount = 50 * (timeLeft / duration);
      
      // ZurichJS themed confetti colors
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        },
        colors: ['#F1E271', '#EDC936', '#258BCC', '#FFFFFF']
      });
      
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        },
        colors: ['#F1E271', '#EDC936', '#258BCC', '#FFFFFF']
      });
    }, 250);
  };

  const generateReward = (donationAmount: number): Reward | null => {
    // Only eligible if donation is 20 CHF or more
    if (donationAmount < 20) {
      return null;
    }
    
    // Win rate = donation amount (20 CHF = 20%, 50 CHF = 50%, 100 CHF = 100%)
    // Cap at 100% for donations of 100 CHF or more
    const winRate = Math.min(donationAmount / 100, 1);
    const random = Math.random();
    
    if (random < winRate) {
      // For donations 50 CHF and above, higher chance for free t-shirt
      if (donationAmount >= 50 && Math.random() < 0.4) {
        return REWARDS[1]; // free t-shirt
      }
      
      // Equal chances for other rewards
      const rewardRandom = Math.random();
      if (rewardRandom < 0.4) {
        return REWARDS[0]; // 50% off workshop
      } else if (rewardRandom < 0.7) {
        return REWARDS[2]; // sticker pack
      } else {
        return REWARDS[3]; // keychain
      }
    }
    
    return null;
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      const donationAmount = parseFloat(amount);
      const generatedReward = generateReward(donationAmount);
      setReward(generatedReward);
      setShowThankYou(true);
      setIsProcessing(false);
      triggerConfetti();
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleDonate();
    }
  };

  const resetForm = () => {
    setShowThankYou(false);
    setReward(null);
    setAmount('');
  };

  return (
    <>
      <Head>
        <title>Donate - ZurichJS</title>
        <meta name="description" content="Support ZurichJS with a donation and maybe win some swag!" />
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-js to-js-dark flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {!showThankYou ? (
                <motion.div
                  key="donation-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-2xl p-8 text-center"
                >
                  <div className="mb-8">
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                      className="inline-block text-6xl mb-4"
                    >
                      ☕
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Want to donate?
                    </h1>
                    <p className="text-gray-600 text-lg">
                      Drop some cash and hit the button
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Win rate = your donation amount! 20 CHF = 20%, 100 CHF = guaranteed win! 🎉
                    </p>
                  </div>

                  <div className="space-y-8">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-xl">CHF</span>
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-16 pr-4 py-4 text-2xl text-center border-2 border-gray-200 rounded-xl focus:border-zurich focus:ring-2 focus:ring-zurich focus:ring-opacity-20 transition-all outline-none"
                        disabled={isProcessing}
                      />
                      {amount && parseFloat(amount) >= 20 && (
                        <div className="absolute -bottom-6 left-0 right-0 text-center">
                          <span className="inline-block bg-zurich text-white text-xs px-2 py-1 rounded-full">
                            {Math.min(parseFloat(amount), 100)}% win chance
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleDonate}
                      disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
                      className="w-full bg-zurich hover:bg-blue-600 text-white py-4 text-xl font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Heart className="w-5 h-5" />
                          Donate Now
                        </div>
                      )}
                    </Button>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-700 mb-2">
                        <Gift className="w-4 h-4" />
                        <span>Possible Prizes:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <span>🎫</span>
                          <span>50% off workshop</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>👕</span>
                          <span>Free t-shirt (≥50 CHF)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🎁</span>
                          <span>Sticker pack</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🔑</span>
                          <span>ZurichJS keychain</span>
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                        Win rate = donation amount (min. 20 CHF, max 100%)
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="thank-you"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-2xl p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
                    className="text-6xl mb-6"
                  >
                    🎉
                  </motion.div>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl font-bold text-gray-900 mb-4"
                  >
                    Thank You!
                  </motion.h1>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg text-gray-600 mb-6"
                  >
                    Your generous donation of <strong>CHF {amount}</strong> helps keep ZurichJS running!
                  </motion.p>

                  {reward ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="bg-gradient-to-r from-js to-js-dark rounded-xl p-6 mb-6 text-center"
                    >
                      <div className="text-4xl mb-3">{reward.icon}</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{reward.title}</h3>
                      <p className="text-gray-700">{reward.description}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="bg-gray-50 rounded-xl p-6 mb-6"
                    >
                      <div className="text-3xl mb-2">💝</div>
                      {parseFloat(amount) < 20 ? (
                        <>
                          <p className="text-gray-600">
                            Thank you for your support! Every donation counts.
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            💡 Tip: Donations ≥20 CHF are eligible for prizes! Win rate = your donation amount.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600">
                            No prize this time, but your support means the world to us!
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Keep trying - wheel of fortune coming soon! 🎡
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={resetForm}
                      className="w-full bg-zurich hover:bg-blue-600 text-white py-3 rounded-xl"
                    >
                      <Coffee className="w-4 h-4 mr-2" />
                      Donate Again
                    </Button>
                    
                    <Button
                      href="/"
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-800"
                    >
                      Back to Home
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Layout>
    </>
  );
}