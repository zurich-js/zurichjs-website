import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Sparkles, ArrowRight, BookOpen, Trophy, Star, Zap } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';


// Workshop interface
export interface Workshop {
  id: string;
  title: string;
  subtitle: string;
  dateInfo: string;
  timeInfo: string;
  locationInfo: string;
  maxAttendees: number;
  description: string;
  image?: string;
  price?: string;
  instructor?: string;
  level?: string;
  confirmedDate?: boolean;
}

interface UpcomingWorkshopsProps {
  workshops: Workshop[];
}

export default function UpcomingWorkshops({
  workshops,
}: UpcomingWorkshopsProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!workshops || workshops.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <Section variant="gray" className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-blue-200 rounded-full opacity-40 blur-3xl"></div>
        <div className="absolute bottom-20 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200 to-yellow-200 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-yellow-100 to-blue-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Enhanced header */}
        <motion.div
          initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-blue-50 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-yellow-200/50">
            <BookOpen size={20} className="text-blue-600 mr-2" />
            <span className="font-semibold text-blue-900">Hands-On Learning</span>
            <Trophy size={18} className="text-yellow-600 ml-2" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600">Workshops</span> 🛠️
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Deep-dive into JavaScript technologies with expert-led, hands-on workshops designed to boost your skills and accelerate your career!
          </p>
        </motion.div>

        {/* Workshops grid with enhanced animations */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12"
        >
          {workshops.map((workshop) => (
            <motion.div
              key={workshop.id}
              variants={cardVariants}
              whileHover={{ 
                y: -10, 
                scale: 1.03,
                transition: { duration: 0.3 }
              }}
              className="group h-full"
            >
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-yellow-300 h-full flex flex-col">
                {/* Workshop image - Increased height */}
                <div className="relative h-64 overflow-hidden flex-shrink-0">
                  {workshop.image ? (
                    <Image
                      src={workshop.image}
                      alt={workshop.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 via-yellow-500 to-blue-600 flex items-center justify-center p-6">
                      <div className="text-center text-white">
                        <div className="text-5xl mb-3">🛠️</div>
                        <div className="flex justify-center space-x-3 opacity-80">
                          <span className="text-2xl">💡</span>
                          <span className="text-2xl">📚</span>
                          <span className="text-2xl">⚡</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Bottom shadow gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Workshop badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Hands-On Workshop
                    </span>
                  </div>
                  
                  {/* Level badge */}
                  {workshop.level && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      {workshop.level}
                    </div>
                  )}
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white text-xl font-bold line-clamp-2">
                      {workshop.title}
                    </h3>
                    {workshop.subtitle && (
                      <p className="text-white/80 text-sm mt-1 line-clamp-1 drop-shadow-md">
                        {workshop.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Workshop details - Flexible container */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Workshop info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100 group-hover:bg-blue-100 transition-colors"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {workshop.dateInfo || 'Date TBD'}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center p-2 bg-yellow-50 rounded-lg border border-yellow-100 group-hover:bg-yellow-100 transition-colors"
                    >
                      <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {workshop.timeInfo || 'Time TBD'}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center p-2 bg-green-50 rounded-lg border border-green-100 group-hover:bg-green-100 transition-colors"
                    >
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {workshop.locationInfo || 'Venue TBD'}
                      </span>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center p-2 bg-purple-50 rounded-lg border border-purple-100 group-hover:bg-purple-100 transition-colors"
                    >
                      <Users className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        Max {workshop.maxAttendees || '12'}
                      </span>
                    </motion.div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 group-hover:text-gray-700 transition-colors flex-1">
                    {workshop.description}
                  </p>

                  {/* Instructor and price */}
                  <div className="flex items-center justify-between mb-4">
                    {workshop.instructor && (
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-yellow-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">👨‍🏫</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{workshop.instructor}</span>
                      </div>
                    )}
                    
                    {workshop.price ? (
                      <div className="bg-yellow-100 text-yellow-800 text-sm font-bold px-3 py-1 rounded-full">
                        {workshop.price}
                      </div>
                    ) : workshop.confirmedDate ? (
                      <div className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                        Price coming soon
                      </div>
                    ) : (
                      <div className="bg-gray-100 text-gray-600 text-sm font-bold px-3 py-1 rounded-full">
                        Details coming soon
                      </div>
                    )}
                  </div>

                  {/* CTA Button - Always at bottom */}
                  <div className="mt-auto">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <a
                        href={`/workshops/${workshop.id}`}
                                                 className="inline-flex items-center justify-center w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group-hover:shadow-2xl"
                      >
                        <span>Learn More & Register</span>
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced call to action */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center bg-gradient-to-r from-blue-50 to-yellow-50 rounded-2xl p-8 border border-yellow-200/50 backdrop-blur-sm"
        >
          <div className="mb-6">
            <div className="inline-flex items-center mb-4">
              <Star size={24} className="text-yellow-500 mr-2" />
              <h3 className="text-2xl font-bold text-gray-900">
                Ready to Master JavaScript? 🚀
              </h3>
              <Star size={24} className="text-yellow-500 ml-2" />
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Expert-led workshops, hands-on practice, career-boosting skills, and small group settings for personalized attention. 
              Transform your JavaScript knowledge from good to extraordinary!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button
              href="/workshops"
              variant="primary"
              size="lg"
              className="group bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg hover:shadow-xl"
            >
              <span>Explore All Workshops</span>
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              href="/cfp"
              variant="outline"
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              Teach a Workshop
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Zap size={16} className="mr-2 text-blue-500" />
              <span>Hands-on learning</span>
            </div>
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Trophy size={16} className="mr-2 text-yellow-500" />
              <span>Expert guidance</span>
            </div>
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <Sparkles size={16} className="mr-2 text-yellow-500" />
              <span>Career-boosting skills</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
