import { useUser } from '@clerk/nextjs';
import { User, Calendar, Gift, Star, ArrowRight, Heart, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

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
      icon: <Heart className="w-5 sm:w-6 h-5 sm:h-6 text-red-600" />,
      title: "Supporting Our Mission",
      description: "Help us continue our non-profit work supporting speakers and organizing quality events for the entire community"
    },
    {
      icon: <Gift className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-600" />,
      title: "Member Rewards",
      description: "Get 20% off workshops and exclusive benefits as our way of giving back to dedicated community members"
    },
    {
      icon: <Calendar className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />,
      title: "Priority Access",
      description: "Reserve your spot early before events reach capacity and get first access to new workshops"
    },
    {
      icon: <Star className="w-5 sm:w-6 h-5 sm:h-6 text-amber-500" />,
      title: "Community Impact",
      description: "Earn credits through participation and referrals, then use them to unlock exclusive community benefits"
    }
  ];

  return (
    <Section className="bg-gradient-to-br from-slate-50 via-white to-blue-50" padding="lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center bg-blue-50 px-4 sm:px-6 py-2 sm:py-3 rounded-full mb-6 sm:mb-8 border border-blue-200 shadow-sm">
            <Heart size={18} className="text-red-500 mr-2 sm:mr-3" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">Non-Profit Community</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 sm:mb-8 leading-tight">
            Join Our <span className="text-blue-600">JavaScript</span> Family
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-700 max-w-4xl mx-auto mb-4 sm:mb-6 leading-relaxed px-2 sm:px-0">
            We&apos;re a registered non-profit association dedicated to serving the JavaScript community. 
            When you join us, you&apos;re not just getting benefits – you&apos;re helping us give back.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-600 text-base sm:text-lg px-4 sm:px-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 flex-shrink-0" />
              <span>Your data is protected. </span>
            </div>
            <Link 
              href="/policies/privacy-policy"
              className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors touch-manipulation"
            >
              Learn how we use your data
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex-shrink-0 p-3 sm:p-4 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors duration-300">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3 group-hover:text-blue-700 transition-colors">{benefit.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call-to-Action */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Make an Impact?
          </h3>
          
          <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            Create your account to unlock member benefits and help us build a stronger, 
            more inclusive JavaScript community for everyone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center mb-6 sm:mb-10 px-4 sm:px-0">
            <Button
              href="/?signup=true"
              variant="primary"
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 !text-black font-bold px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto min-h-[48px] touch-manipulation"
              onClick={handleSignUpClick}
            >
              <User size={18} className="mr-2 sm:mr-3 flex-shrink-0" />
              Create Account
            </Button>
            
            <Button
              href="/?signup=true"
              variant="outline"
              size="lg"
              className="border-2 border-white/80 text-white hover:bg-white hover:!text-black font-bold px-8 sm:px-10 py-3 sm:py-4 cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
              onClick={handleSignInClick}
            >
              Sign In <ArrowRight size={16} className="ml-2 sm:ml-3 flex-shrink-0" />
            </Button>
          </div>
          
          {/* Quick Benefits */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-8 text-blue-100 text-sm sm:text-base pt-6 sm:pt-8 border-t border-blue-500/30">
            <span className="flex items-center justify-center cursor-pointer hover:text-white transition-colors duration-200">
              <Heart className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Support speakers
            </span>
            <span className="flex items-center justify-center cursor-pointer hover:text-white transition-colors duration-200">
              <Gift className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Member discounts
            </span>
            <span className="flex items-center justify-center cursor-pointer hover:text-white transition-colors duration-200">
              <Star className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Community rewards
            </span>
          </div>
        </div>

        {/* Community Feedback Section */}
        <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 mt-8 sm:mt-12 border border-slate-200">
          <div className="text-center">
            <Mail className="w-10 sm:w-12 h-10 sm:h-12 text-blue-600 mx-auto mb-4 sm:mb-6" />
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">
              We&apos;re All Ears! 👂
            </h3>
            
            <p className="text-base sm:text-lg text-slate-700 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Have suggestions, feedback, or ideas? We love hearing from our community! 
              We value your input, reward great suggestions, and want to make ZurichJS even better together.
            </p>
            
            <a
              href="mailto:hello@zurichjs.com?subject=I have feedback for ZurichJS"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-base sm:text-lg min-h-[48px] touch-manipulation"
            >
              <Mail className="w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
              hello@zurichjs.com
            </a>
            
            <p className="text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4 px-4 sm:px-0">
              Whether it&apos;s event ideas, speaker suggestions, or ways we can improve – we want to hear it all!
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
} 