import { motion } from 'framer-motion';
import { Code, Users, Lightbulb, Globe, Heart, Star } from 'lucide-react';

// Define TypeScript interfaces
interface CommunityValue {
  icon: JSX.Element;
  title: string;
  description: string;
  emoji?: string;
}

interface CommunityValuesProps {
  titleClassName?: string;
  cardClassName?: string;
  iconColor?: string;
  backgroundColor?: string;
}

export default function CommunityValues({
  titleClassName = 'text-gray-900',
  cardClassName = 'bg-white',
  iconColor = 'text-blue-600',
  backgroundColor = 'bg-gradient-to-br from-js to-js-dark'
}: CommunityValuesProps) {
  
  const values: CommunityValue[] = [
    {
      icon: <Code size={36} />,
      title: 'Epic Knowledge Sharing',
      description: 'Got JS wisdom? Share it! We believe in freely exchanging ideas so everyone can level up their JavaScript superpowers! No gatekeeping, just pure learning goodness.',
      emoji: '🧠'
    },
    {
      icon: <Users size={36} />,
      title: 'Everyone Belongs Here',
      description: 'From JS newbies to seasoned pros - our community welcomes developers of all backgrounds, experience levels, and coding styles with open arms! Your unique perspective matters!',
      emoji: '🤗'
    },
    {
      icon: <Lightbulb size={36} />,
      title: 'Cutting-Edge Innovation',
      description: "We're all about exploring those shiny new JS frameworks, libraries, and techniques! Stay ahead of the curve and geek out with fellow tech enthusiasts on the coolest JS innovations!",
      emoji: '💡'
    },
    {
      icon: <Globe size={36} />,
      title: 'Zurich × Global JS Scene',
      description: 'Proudly rooted in our beautiful city of Zurich, but connected to the worldwide JavaScript ecosystem. We bring global JS trends to our local community and showcase Swiss JS talent!',
      emoji: '🌍'
    },
  ];

  return (
    <section className={`py-16 ${backgroundColor}`}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center bg-white/30 px-4 py-2 rounded-full mb-4">
            <Heart size={18} className="text-red-500 mr-2" />
            <span className="font-medium text-black">What makes our JS community special</span>
          </div>
          
          <h2 className={`text-3xl font-bold mb-3 ${titleClassName}`}>Our JavaScript Community Values ✨</h2>
          <p className="text-gray-800 max-w-3xl mx-auto text-lg">
            These aren&apos;t just words on a screen - they&apos;re the core principles that make ZurichJS the most vibrant, 
            welcoming, and knowledge-packed JavaScript community in Switzerland! 💛
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                y: -5, 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                transition: { duration: 0.2 }
              }}
              className={`${cardClassName} p-6 rounded-lg shadow-md relative overflow-hidden`}
            >
              {/* Decorative star in background */}
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Star size={100} />
              </div>
              
              <div className="flex justify-between items-start mb-4">
                <div className={`${iconColor} z-10`}>{value.icon}</div>
                {value.emoji && (
                  <div className="text-2xl" aria-hidden="true">
                    {value.emoji}
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold mb-2 text-gray-900 z-10 relative">
                {value.title}
              </h3>
              <p className="text-gray-700 z-10 relative">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-lg font-medium text-gray-800">
            Sound like your kind of community? Join us at our next meetup and experience the ZurichJS magic! 🪄
          </p>
        </motion.div>
      </div>
    </section>
  );
}
