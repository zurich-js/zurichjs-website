import { ArrowRight, Users, Code, Heart, Coffee } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';

import Section from "@/components/Section";
import { FeatureFlags } from '@/constants';

import Button from '../ui/Button';
import Newsletter from '../ui/Newsletter';

// Define TypeScript interfaces
interface Benefit {
  title: string;
  description: string;
  icon: JSX.Element;
  iconColor: string;
}

interface JoinCTAProps {
  benefits?: Benefit[];
  newsletterTitle?: string;
  buttonUrl?: string;
}

export default function JoinCTA({
  benefits = [
    {
      title: "Monthly Meetups",
      description: "Regular gatherings with JavaScript talks and networking opportunities",
      icon: <Users size={18} className="sm:w-5 sm:h-5" />,
      iconColor: "text-blue-600"
    },
    {
      title: "Expert Speakers",
      description: "Learn from industry professionals and experienced developers",
      icon: <Code size={18} className="sm:w-5 sm:h-5" />,
      iconColor: "text-green-600"
    },
    {
      title: "Welcoming Community",
      description: "Connect with like-minded JavaScript developers in Zurich",
      icon: <Heart size={18} className="sm:w-5 sm:h-5" />,
      iconColor: "text-red-600"
    },
    {
      title: "Food & Drinks",
      description: "Enjoy refreshments while networking with fellow developers",
      icon: <Coffee size={18} className="sm:w-5 sm:h-5" />,
      iconColor: "text-orange-600"
    }
  ],
  newsletterTitle = "Stay in the Loop",
  buttonUrl = "https://meetup.com/zurich-js"
}: JoinCTAProps) {
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);

  return (
    <Section variant="black" padding="lg">
      <div className="px-4 sm:px-6">
        <div className={`flex flex-col ${showNewsletter ? 'lg:flex-row lg:gap-12' : ''} gap-8 sm:gap-12 max-w-6xl mx-auto`}>
          {/* Main CTA Section */}
          <div className={`${showNewsletter ? 'lg:w-2/3' : 'max-w-4xl mx-auto'} text-center ${showNewsletter ? 'lg:text-left' : ''}`}>
            {/* Header */}
            <div className="mb-8 sm:mb-12">
              <div className="inline-flex items-center bg-white/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-white/20">
                <span className="font-semibold text-white text-xs sm:text-sm">Join Our Community</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
                Ready to Join Zurich&apos;s <span className="text-js">JavaScript Community</span>?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0">
                Whether you&apos;re a beginner or expert, join our welcoming community of JavaScript developers. 
                Let&apos;s learn and build amazing things together.
              </p>
            </div>

            {/* Benefits grid with distinct colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                >
                  {/* Icon with distinct color */}
                  <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg mb-3 sm:mb-4 ${benefit.iconColor} transition-all duration-200 hover:scale-110`}>
                    {benefit.icon}
                  </div>
                  
                  <h3 className="font-bold text-white text-base sm:text-lg mb-2">{benefit.title}</h3>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{benefit.description}</p>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div className="mb-6 sm:mb-8">
              <Button
                href={buttonUrl}
                variant="primary"
                size="lg"
                className="bg-js hover:bg-js-dark !text-black font-bold shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer w-full sm:w-auto min-h-[48px] touch-manipulation"
              >
                <span>Join Our Community</span>
                <ArrowRight size={18} className="ml-2 flex-shrink-0" />
              </Button>
            </div>

            {/* Social proof */}
            <div className="text-center text-gray-400 text-xs sm:text-sm">
              <span>Join 500+ JavaScript developers in Zurich&apos;s most welcoming tech community</span>
            </div>
          </div>

          {/* Newsletter section */}
          {showNewsletter && (
            <div className="lg:w-1/3">
              <div className="bg-white/5 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200">
                {/* Newsletter header */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{newsletterTitle}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Get notified about upcoming meetups, special events, and JavaScript news in Zurich.
                  </p>
                </div>
                
                <Newsletter />
                
                <p className="mt-3 sm:mt-4 text-xs text-gray-400">
                  No spam, just JavaScript community updates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
