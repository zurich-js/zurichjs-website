import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function RafflePopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if popup should be shown based on time
        const eventEndTime = new Date('2025-06-18T16:00:00+02:00').getTime();
        const now = new Date().getTime();
        
        // Check if we're past the event end time
        if (now >= eventEndTime) {
            return;
        }

        // Check if popup was previously dismissed
        const dismissed = localStorage.getItem('rafflePopupDismissed');
        if (!dismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('rafflePopupDismissed', 'true');
    };

    if (isDismissed) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-4 right-4 z-50 max-w-md bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-xl border border-purple-200 p-4 sm:p-6"
                >
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                        aria-label="Close popup"
                    >
                        <X size={20} />
                    </button>

                    <div className="pr-6">
                        <h3 className="text-lg font-bold text-purple-700 mb-2">🎉 Special Raffle & Referral Program!</h3>
                        <p className="text-gray-800 mb-3">Get your ticket now and enter our exciting raffle with amazing prizes:</p>
                        
                        <ul className="space-y-1 mb-3 text-sm">
                            <li className="flex items-start">
                                <span className="text-purple-500 mr-2">•</span>
                                <span className="text-gray-700">12-day pass for ORBIZ Flex Office Josef</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-500 mr-2">•</span>
                                <span className="text-gray-700">CHF 100 ZurichJS workshop coupon</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-500 mr-2">•</span>
                                <span className="text-gray-700">12-month Perplexity Pro subscription</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-purple-500 mr-2">•</span>
                                <span className="text-gray-700">2x JetBrains 1-year licenses</span>
                            </li>
                        </ul>

                        <div className="bg-white p-2 rounded-lg border border-purple-100 mb-3">
                            <p className="text-sm font-medium text-purple-700">🎁 Refer a Friend Bonus:</p>
                            <p className="text-gray-700 text-xs">Bring a friend to the meetup and get in for free!</p>
                        </div>

                        <p className="text-xs text-gray-600 italic">Winners drawn LIVE at the meetup. Must be present to claim prizes!</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
} 