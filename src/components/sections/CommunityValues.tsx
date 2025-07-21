import { Code, Users, Lightbulb, Globe, Heart } from 'lucide-react';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';

interface CommunityValue {
  icon: JSX.Element;
  title: string;
  description: string;
  iconColor: string;
  iconBgColor: string;
}

export default function CommunityValues() {
  const values: CommunityValue[] = [
    {
      icon: <Code size={18} className="sm:w-5 sm:h-5" />,
      title: 'Knowledge Sharing',
      description: 'We believe in freely exchanging ideas so everyone can level up their JavaScript skills. No gatekeeping, just pure learning and growth together.',
      iconColor: 'text-blue-700',
      iconBgColor: 'bg-blue-100'
    },
    {
      icon: <Users size={18} className="sm:w-5 sm:h-5" />,
      title: 'Everyone Belongs Here',
      description: 'From JS beginners to seasoned professionals - our community welcomes developers of all backgrounds and experience levels with open arms.',
      iconColor: 'text-green-700',
      iconBgColor: 'bg-green-100'
    },
    {
      icon: <Lightbulb size={18} className="sm:w-5 sm:h-5" />,
      title: 'Innovation & Learning',
      description: 'We explore the latest JS frameworks, libraries, and techniques. Stay ahead of the curve and discover new technologies with fellow enthusiasts.',
      iconColor: 'text-yellow-700',
      iconBgColor: 'bg-yellow-100'
    },
    {
      icon: <Globe size={18} className="sm:w-5 sm:h-5" />,
      title: 'ZurichJS X Global Scene',
      description: 'Proudly rooted in Zurich but connected to the worldwide JavaScript ecosystem. We bring global trends to our local community.',
      iconColor: 'text-purple-700',
      iconBgColor: 'bg-purple-100'
    },
  ];

  return (
    <Section variant="white" padding="md">
      <div className="px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center bg-black/10 px-3 py-1.5 rounded-full mb-3 sm:mb-4 border border-black/20">
            <Heart size={14} className="text-red-600 mr-2 sm:w-4 sm:h-4" />
            <span className="font-semibold text-black text-xs sm:text-sm">Our Community Values</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-3 sm:mb-4">
            What Makes Our JavaScript <span className="text-zurich">Community</span> Special
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-black/80 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
            These aren&apos;t just words - they&apos;re the principles that make ZurichJS the most welcoming 
            and knowledge-packed JavaScript community in Switzerland.
          </p>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {values.map((value, index) => (
            <div
              key={index}
              className="bg-white/20 backdrop-blur p-4 sm:p-6 rounded-xl border border-black/20 hover:border-black/30 hover:bg-white/30 transition-all duration-200 shadow-lg cursor-pointer"
            >
              {/* Icon with distinct colors */}
              <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 ${value.iconBgColor} ${value.iconColor} rounded-lg mb-3 sm:mb-4 transition-all duration-200 hover:scale-110`}>
                {value.icon}
              </div>

              {/* Content */}
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-black mb-2 sm:mb-3">
                {value.title}
              </h3>
              <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center bg-white/20 backdrop-blur rounded-xl p-4 sm:p-6 border border-black/20 shadow-lg">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-2 sm:mb-3">
            Ready to Experience Our Community?
          </h3>
          <p className="text-sm sm:text-base text-black/70 mb-4 sm:mb-6 leading-relaxed max-w-xl mx-auto px-2 sm:px-0">
            Join us at our next meetup and discover what makes ZurichJS special. 
            Connect with like-minded developers and be part of something great.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Button
              href="https://www.meetup.com/zurich-js"
              variant="primary"
              size="md"
              className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              Join Our Next Meetup
            </Button>
            
            <Button
              href="/about"
              variant="outline"
              size="md"
              className="border border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              Learn More About Us
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
