import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { User, Zap, CreditCard, Calendar, Gift, Users, ArrowRight, Star } from 'lucide-react';

import Section from '@/components/Section';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';

export default function AccountIncentives() {
  const { user, isLoaded } = useUser();
  const { track } = useEvents();

  // Don't show to logged-in users
  if (isLoaded && user) {
    return null;
  }

  const handleSignUpClick = () => {
    track('button_click', { name: 'account_incentives_signup' });
  };

  const handleSignInClick = () => {
    track('button_click', { name: 'account_incentives_signin' });
  };

  const benefits = [
    {
      icon: <Users className="w-6 h-6 text-blue-600" />,
      title: "Community Support",
      description: "Help us support speakers and organize quality events",
      highlight: false
    },
    {
      icon: <Zap className="w-6 h-6 text-green-600" />,
      title: "Member Discounts",
      description: "20% off workshops as our way of saying thanks",
      highlight: false
    },
    {
      icon: <Calendar className="w-6 h-6 text-purple-600" />,
      title: "Early Access",
      description: "Reserve your spot before events fill up",
      highlight: false
    },
    {
      icon: <Gift className="w-6 h-6 text-pink-600" />,
      title: "Community Rewards",
      description: "Earn credits through participation and referrals",
      highlight: false
    },
    {
      icon: <CreditCard className="w-6 h-6 text-orange-600" />,
      title: "Streamlined Experience",
      description: "Faster registration and personalized recommendations",
      highlight: false
    },
    {
      icon: <Star className="w-6 h-6 text-yellow-600" />,
      title: "Stay Connected",
      description: "Join our Slack community and never miss an update",
      highlight: false
    }
  ];

  const rewards = [
    { name: "Workshop 50% Off", credits: 500 },
    { name: "Free Pro Meetup", credits: 100 },
    { name: "ZurichJS T-shirt", credits: 250 },
    { name: "Sticker Pack", credits: 50 }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerChildren = {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true },
    transition: {
      staggerChildren: 0.1
    }
  };

  return (
    <Section variant="white" padding="lg">
      <motion.div 
        className="text-center mb-12"
        {...fadeInUp}
      >
        <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full mb-6 border border-blue-200">
          <User size={18} className="text-blue-600 mr-2" />
          <span className="font-medium text-blue-700 text-sm">Member Exclusive Benefits</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          Join Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-zurich">JavaScript Community</span> 🤝
        </h2>
        
        <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
          We believe in giving back to our community. By creating an account, you help us support speakers, 
          organize better events, and keep everything accessible. In return, we share the benefits with you through 
          <span className="font-semibold text-blue-600"> discounts</span>, 
          <span className="font-semibold text-green-600"> early access</span>, and 
          <span className="font-semibold text-purple-600"> community rewards</span>.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Benefits Section */}
        <motion.div 
          className="lg:col-span-2"
          {...staggerChildren}
        >
          <motion.h3 
            className="text-2xl font-bold text-gray-900 mb-6 flex items-center"
            {...fadeInUp}
          >
            <Star className="w-6 h-6 text-yellow-500 mr-2" />
            Instant Member Benefits
          </motion.h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className={`p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                  benefit.highlight 
                    ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >

                <div className="relative">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                      <p className="text-gray-600 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Rewards Preview */}
        <motion.div 
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200"
          {...fadeInUp}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Gift className="w-5 h-5 text-purple-600 mr-2" />
            Rewards You Can Earn
          </h3>
          
          <div className="space-y-3 mb-6">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.name}
                className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <span className="font-medium text-gray-800 text-sm">{reward.name}</span>
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                  {reward.credits} credits
                </span>
              </motion.div>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-green-100 to-teal-100 p-3 rounded-lg border border-green-200 text-center">
            <p className="text-green-800 text-sm font-medium">
              💰 Earn credits through referrals & purchases
            </p>
            <p className="text-green-700 text-xs mt-1">
              Start with 5 credits just for signing up!
            </p>
          </div>
        </motion.div>
      </div>

      {/* Condensed Call to Action */}
      <motion.div 
        className="relative overflow-hidden"
        {...fadeInUp}
      >
        {/* Simplified background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 p-6 text-white text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Become Part of Our <span className="text-yellow-300">Community</span>
          </h3>
          
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            By creating an account, you help us understand your interests and build a better community for you. 
            In return, we give back through rewards, discounts, and experiences tailored just for our members.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                href="/?signup=true"
                variant="primary"
                size="lg"
                className="bg-js text-black hover:bg-js-dark shadow-xl transition-all duration-300 font-bold"
                onClick={handleSignUpClick}
              >
                <User size={18} className="mr-2" />
                Create Account
              </Button>
            </motion.div>
            
            <Button
              href="/?signup=true"
              variant="ghost"
              className="text-white hover:bg-zurich hover:scale-105 transition-all duration-200"
              onClick={handleSignInClick}
            >
              Sign In <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
          
          {/* Community values */}
          <div className="flex flex-wrap justify-center gap-4 text-white/90 text-sm">
            <span className="flex items-center">🤝 Support speakers</span>
            <span className="flex items-center">🎯 Better events</span>
            <span className="flex items-center">💫 Shared benefits</span>
          </div>
        </div>
      </motion.div>
    </Section>
  );
} 