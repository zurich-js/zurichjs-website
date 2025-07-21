import { Clock, Calendar, ArrowRight, BookOpen } from 'lucide-react';
import Image from 'next/image';

import Section from '@/components/Section';
import Button from '@/components/ui/Button';

export interface Workshop {
  id: string;
  title: string;
  subtitle?: string;
  instructor?: string;
  dateInfo: string;
  timeInfo: string;
  locationInfo?: string;
  duration?: string;
  price?: string;
  description: string;
  image?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  maxAttendees?: number;
  currentAttendees?: number;
  stripePriceId?: string;
  confirmedDate?: boolean;
}

interface UpcomingWorkshopsProps {
  workshops: Workshop[];
}

export default function UpcomingWorkshops({
  workshops,
}: UpcomingWorkshopsProps) {

  if (!workshops || workshops.length === 0) {
    return (
      <Section variant="gradient" padding="lg">
        <div className="text-center max-w-2xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center bg-black/20 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-black/30 shadow-sm">
            <BookOpen size={16} className="text-black mr-2" />
            <span className="font-semibold text-black text-xs sm:text-sm">Upcoming Workshops</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-3 sm:mb-4">
            New Workshops Coming Soon
          </h2>
          <p className="text-base sm:text-lg text-black/90 mb-4 sm:mb-6">
            We&apos;re developing hands-on workshops to help you master JavaScript technologies. Stay tuned!
          </p>
          
          <Button
            href="https://www.meetup.com/zurich-js"
            variant="primary"
            size="lg"
            className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
          >
            Get Notified
          </Button>
        </div>
      </Section>
    );
  }

  const getLevelColor = (level: Workshop['level']) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-200 text-green-900 border-green-300';
      case 'intermediate':
        return 'bg-blue-200 text-blue-900 border-blue-300';
      case 'advanced':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-200 text-gray-900 border-gray-300';
    }
  };

  // Helper function to format price to CHF
  const formatPrice = (price: string) => {
    // Remove any currency symbols and return with CHF prefix
    const numericPrice = price.replace(/[$€£]/g, '').trim();
    return `CHF ${numericPrice}`;
  };

  return (
    <Section variant="js" padding="lg">
      <div className="px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center bg-black/20 px-3 sm:px-4 py-2 rounded-full mb-3 sm:mb-4 border border-black/30 shadow-sm">
            <BookOpen size={16} className="text-black mr-2" />
            <span className="font-semibold text-black text-xs sm:text-sm">Hands-On Learning</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-3 sm:mb-4">
            Upcoming <span className="text-zurich">Workshops</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-black/90 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            Deep-dive into JavaScript technologies with expert-led workshops designed to boost your skills.
          </p>
        </div>

        {/* Workshops grid - more compact responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {workshops.map((workshop) => (
            <div
              key={workshop.id}
              className="bg-white border border-black/20 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 shadow-lg cursor-pointer"
            >
              {/* Workshop Image - Responsive aspect ratio */}
              {workshop.image && (
                <div className="relative w-full aspect-[5/2] sm:aspect-[3/1]">
                  <Image 
                    src={workshop.image} 
                    alt={workshop.title}
                    fill
                    className="object-cover"
                  />
                  {/* Price overlay */}
                  {workshop.price && (
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-white/95 backdrop-blur px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg">
                      <span className="font-bold text-black text-sm sm:text-lg">{formatPrice(workshop.price)}</span>
                    </div>
                  )}
                  {/* Level badge overlay */}
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                    <span className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur ${getLevelColor(workshop.level)}`}>
                      {workshop.level.charAt(0).toUpperCase() + workshop.level.slice(1)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Workshop Content */}
              <div className="p-4 sm:p-6 flex flex-col">
                {/* Header */}
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black mb-2 leading-tight">
                    {workshop.title}
                  </h3>
                </div>

                {/* Workshop details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 text-sm">
                  <div className="flex items-center text-black/80">
                    <Calendar className="w-4 h-4 mr-2 sm:mr-3 text-zurich flex-shrink-0" />
                    <span className="font-medium">{workshop.dateInfo}</span>
                  </div>
                  
                  <div className="flex items-center text-black/80">
                    <Clock className="w-4 h-4 mr-2 sm:mr-3 text-zurich flex-shrink-0" />
                    <span className="font-medium">{workshop.timeInfo}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-black/70 text-sm leading-relaxed mb-3 sm:mb-4 flex-grow line-clamp-3 sm:line-clamp-4">
                  {workshop.description}
                </p>

                {/* Tags */}
                {workshop.tags && workshop.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                    {workshop.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="bg-black/10 text-black/80 text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-black/20 hover:bg-black/20 cursor-pointer transition-colors duration-200">
                        {tag}
                      </span>
                    ))}
                    {workshop.tags.length > 4 && (
                      <span className="text-black/60 text-xs self-center">+{workshop.tags.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Action and progress */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mt-auto">
                  <Button
                    href={`/workshops/${workshop.id}`}
                    variant="primary"
                    size="lg"
                    className="bg-black hover:bg-gray-800 text-white font-semibold cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation order-2 sm:order-1"
                  >
                    Learn More <ArrowRight size={14} className="ml-2 flex-shrink-0" />
                  </Button>
                  
                  {workshop.maxAttendees && workshop.currentAttendees && (
                    <div className="text-center sm:text-right order-1 sm:order-2">
                      <span className="text-xs sm:text-sm text-black/70 font-medium block mb-1 sm:mb-2">
                        {workshop.currentAttendees}/{workshop.maxAttendees} spots filled
                      </span>
                      <div className="w-full sm:w-20 lg:w-24 bg-black/20 rounded-full h-2 mx-auto sm:mx-0 sm:ml-auto">
                        <div 
                          className="bg-zurich h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(workshop.currentAttendees / workshop.maxAttendees) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action - more compact and mobile-friendly */}
        <div className="text-center bg-white/30 backdrop-blur rounded-2xl p-4 sm:p-6 border border-black/30 shadow-lg">
          <h3 className="text-lg sm:text-xl font-bold text-black mb-2 sm:mb-3">
            Level Up Your JavaScript Skills
          </h3>
          <p className="text-black/90 mb-3 sm:mb-4 leading-relaxed max-w-xl mx-auto text-sm sm:text-base px-2 sm:px-0">
            Join our workshops to gain practical experience and learn from industry experts in small, focused groups.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Button
              href="/workshops"
              variant="primary"
              size="lg"
              className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              View All Workshops
            </Button>
            
            <Button
              href="mailto:hello@zurichjs.com?subject=Workshop%20Topic%20Suggestion"
              variant="outline"
              size="lg"
              className="border-2 border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
            >
              Suggest a Topic
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
