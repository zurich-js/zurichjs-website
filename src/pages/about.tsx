import Image from 'next/image';
import { motion } from 'framer-motion';
import { Code, Users, Calendar, Heart, Sparkles, Coffee, MessageSquare } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import { getStats } from '@/sanity/queries';
import { sendGTMEvent } from '@next/third-parties/google';
import useReferrerTracking from '@/hooks/useReferrerTracking';

// Define our TypeScript interfaces
interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
}

interface Milestone {
  year: string;
  title: string;
  description: string;
  image?: string;
}

interface AboutPageProps {
  teamMembers: TeamMember[];
  milestones: Milestone[];
  stats: {
    members: number;
    eventsHosted: number;
    speakersToDate: number;
    totalAttendees: number;
  };
}

export default function About({ teamMembers, milestones, stats }: AboutPageProps) {
  useReferrerTracking();
  // Track CTA button clicks
  const trackCTAClick = (buttonName: string) => {
    sendGTMEvent({
      event: 'cta_click',
      button_name: buttonName,
      page: 'about'
    });
  };

  return (
    <Layout>
      <SEO 
        title="About ZurichJS | JavaScript Community in Zurich"
        description="Learn about ZurichJS - the vibrant JavaScript community in Zurich bringing together developers, enthusiasts and tech lovers since 2024."
        openGraph={{
          title: "About ZurichJS | JavaScript Community in Zurich",
          description: "Learn about ZurichJS - the vibrant JavaScript community in Zurich bringing together developers, enthusiasts and tech lovers since 2024.",
          image: "/images/community/pic-1.png",
          type: "website"
        }}
      />

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0"
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                  Our JavaScript Story 💛
                </h1>
                <p className="text-xl mb-6 text-gray-900">
                  Welcome to ZurichJS – the heart of JavaScript awesomeness in Zurich since 2024!
                </p>
                <p className="text-lg mb-8 text-gray-900">
                  We&apos;re a thriving community of JS enthusiasts who love to code, learn, and connect. From React wizards to Node.js ninjas, TypeScript pros to vanilla JS lovers – everyone building with JavaScript has a home here!
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:w-1/2"
              >
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <div className="relative h-64 w-full rounded overflow-hidden">
                    <Image
                      src="/images/community/pic-1.png"
                      alt="ZurichJS Community"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center mt-4 mb-2">
                    <span className="text-sm text-gray-700">Our amazing community at a recent meetup! 🎉</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Our Mission 🚀</h2>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center bg-gray-50 p-8 rounded-lg shadow-lg relative"
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-700 p-4 rounded-full shadow-lg">
                  <Heart size={32} className="text-white" />
                </div>
                <p className="text-2xl font-medium mt-6 mb-6 text-gray-900">
                  &quot;To create an inclusive, vibrant space where JavaScript developers of all levels can learn, share, and grow together, fostering innovation and friendship in our tech community.&quot;
                </p>
                <p className="text-gray-700 italic">
                  — The ZurichJS Team
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Code size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Share Knowledge</h3>
                <p className="text-gray-700">
                  We believe in freely sharing our JavaScript expertise to lift everyone up! From beginner tips to advanced techniques, we learn together.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Build Connections</h3>
                <p className="text-gray-700">
                  At ZurichJS, it&apos;s not just about code – it&apos;s about the amazing people! We create meaningful connections that last beyond our meetups.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Foster Innovation</h3>
                <p className="text-gray-700">
                  We&apos;re passionate about exploring new JavaScript frontiers together, from cutting-edge frameworks to revolutionary tools and techniques.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Story Timeline */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Our JavaScript Journey 🗓️</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                From humble beginnings to an unstoppable community of JS enthusiasts!
              </p>
            </motion.div>

            {/* Desktop Timeline - Hidden on mobile */}
            <div className="relative hidden md:block">
              {/* Timeline line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-700"></div>

              {/* Timeline events */}
              <div className="relative">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.year}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className={`flex items-center mb-16 ${
                      index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                      <h3 className="text-2xl font-bold mb-2 text-gray-900">{milestone.title}</h3>
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-3">
                        {milestone.year}
                      </span>
                      <p className="text-gray-700">{milestone.description}</p>
                    </div>

                    {/* Timeline dot */}
                    <div className="w-2/12 flex justify-center">
                      <div className="bg-blue-700 rounded-full w-8 h-8 border-4 border-white shadow-md z-10"></div>
                    </div>

                    {/* Image on alternate sides */}
                    <div className={`w-5/12 ${index % 2 === 0 ? 'pl-8' : 'pr-8'}`}>
                      {milestone.image && (
                        <div className="relative h-48 w-full rounded-lg overflow-hidden shadow-lg">
                          <Image
                            src={milestone.image}
                            alt={milestone.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile Timeline - Visible only on mobile */}
            <div className="md:hidden">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 h-full w-1 bg-blue-700"></div>

                {/* Timeline events - Mobile version */}
                <div className="relative">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={milestone.year}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      className="pl-12 relative mb-12"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-6 transform -translate-x-1/2 bg-blue-700 rounded-full w-8 h-8 border-4 border-white shadow-md z-10"></div>
                      
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                        {milestone.year}
                      </span>
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{milestone.title}</h3>
                      <p className="text-gray-700 mb-4">{milestone.description}</p>
                      
                      {/* Image for mobile */}
                      {milestone.image && (
                        <div className="relative h-48 w-full rounded-lg overflow-hidden shadow-lg mb-4">
                          <Image
                            src={milestone.image}
                            alt={milestone.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Community Stats */}
        <section className="py-16 bg-black text-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-blue-400">ZurichJS by the Numbers 📊</h2>
              <p className="text-xl max-w-3xl mx-auto">
                Our JavaScript community continues to grow and thrive thanks to amazing members like you!
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-900 p-6 rounded-lg"
              >
                <div className="text-blue-400 mx-auto mb-4">
                  <Users size={40} />
                </div>
                <div className="text-4xl font-bold mb-2">{stats.members}</div>
                <div className="text-gray-400">Community Members</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-900 p-6 rounded-lg"
              >
                <div className="text-blue-400 mx-auto mb-4">
                  <Calendar size={40} />
                </div>
                <div className="text-4xl font-bold mb-2">{stats.eventsHosted}</div>
                <div className="text-gray-400">Meetups Hosted</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-900 p-6 rounded-lg"
              >
                <div className="text-blue-400 mx-auto mb-4">
                  <MessageSquare size={40} />
                </div>
                <div className="text-4xl font-bold mb-2">{stats.speakersToDate}</div>
                <div className="text-gray-400">Amazing Speakers</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-900 p-6 rounded-lg"
              >
                <div className="text-blue-400 mx-auto mb-4">
                  <Coffee size={40} />
                </div>
                <div className="text-4xl font-bold mb-2">{stats.totalAttendees}</div>
                <div className="text-gray-400">Total Attendees</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Meet the Team */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Meet the JS Enthusiasts Behind the Magic ✨</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Our team is passionate about building an amazing JavaScript community in Zurich!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg overflow-hidden shadow-md"
                >
                  <div className="relative h-64 w-full">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-1 text-gray-900">{member.name}</h3>
                    <p className="text-blue-700 mb-4">{member.role}</p>
                    <p className="text-gray-700 mb-4">{member.bio}</p>
                    <div className="flex space-x-4">
                      {member.twitter && (
                        <a 
                          href={`https://twitter.com/${member.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400"
                          aria-label={`${member.name}'s Twitter profile`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                          </svg>
                        </a>
                      )}
                      {member.github && (
                        <a 
                          href={`https://github.com/${member.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-black"
                          aria-label={`${member.name}'s GitHub profile`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        </a>
                      )}
                      {member.linkedin && (
                        <a 
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-700"
                          aria-label={`${member.name}'s LinkedIn profile`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Values */}
        <section className="py-16 bg-gradient-to-br from-yellow-400 to-amber-500">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">What Makes ZurichJS Special 💫</h2>
              <p className="text-xl max-w-3xl mx-auto text-gray-900">
                Our community thrives because of these shared values that guide everything we do!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Inclusivity & Respect 🤝</h3>
                <p className="text-gray-700">
                  ZurichJS welcomes everyone, regardless of experience level, background, or coding style! We believe in creating a safe, respectful space where all JavaScript enthusiasts feel valued and heard.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Learning & Growth 📚</h3>
                <p className="text-gray-700">
                  We&apos;re passionate about continuous learning! From beginners to experts, everyone has something to learn and something to teach. We embrace new ideas and technologies with open arms.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Collaboration & Support 🌟</h3>
                <p className="text-gray-700">
                  The magic happens when we work together! We encourage collaboration, mentorship, and supporting each other&apos;s growth in the JavaScript ecosystem.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Fun & Creativity 🎨</h3>
                <p className="text-gray-700">
                  JavaScript should be fun! We celebrate creative solutions, quirky approaches, and the joy of coding. Our meetups combine learning with fun social interactions.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Join Us CTA */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-xl shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-4 text-blue-400">Ready to Join the JS Revolution? 🚀</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                Become part of our vibrant JavaScript community and connect with fellow developers in Zurich!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  href="https://meetup.com/zurichjs" 
                  variant="primary" 
                  size="lg" 
                  className="bg-blue-700 text-white hover:bg-blue-600"
                  onClick={() => trackCTAClick('join_meetup')}
                >
                  Join Our Meetup Group 🎉
                </Button>
                <Button 
                  href="/events" 
                  variant="outline" 
                  size="lg" 
                  className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                  onClick={() => trackCTAClick('discover_events')}
                >
                  Discover Upcoming Events
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // Get stats using the same function as the homepage
  const stats = await getStats();
  
  // This would be replaced with actual CMS fetching
  return {
    props: {
      teamMembers: [
        {
          id: '1',
          name: 'Faris Aziz',
          role: 'Founder & Lead Organizer',
          image: '/images/team/faris.jpg',
          bio: 'JavaScript enthusiast who loves bringing people together! Started ZurichJS to create a space where devs of all levels could share their passion for JS.',
          twitter: 'farisaziz12',
          github: 'farisaziz12',
          linkedin: 'https://linkedin.com/in/farisaziz12',
        },
        {
          id: '2',
          name: 'Bogdan Mihai Ilie',
          role: 'Founder & Lead Organizer',
          image: '/images/team/bogdan.jpg',
          bio: 'Frontend specialist with a knack for making everyone feel welcome! Passionate about inclusive tech communities and Vue.',
          twitter: 'nosthrillz',
          github: 'nosthrillz',
          linkedin: 'https://linkedin.com/in/ilie-bogdan',
        },
      ],
      milestones: [
        {
          year: 'November 2024',
          title: 'Zurich JS is Born!',
          description: 'Our first meetup brought together 34 developers at novu! We seized the opportunity to redefine what a JavaScript community could be in the Zurich area. We were honored to have Nico Martin, a renowned AI Google Developer Expert, as our inaugural speaker.',
          image: '/images/community/meetup-1.png',
        },
        {
          year: 'January 2025',
          title: 'Our Community Grows',
          description: 'We reached 100 followers on LinkedIn while our Meetup group flourished to 80-90 active members. The momentum was building!',
          image: '/images/community/web-zurich-dinner.png',
        },
        {
          year: 'February 2025',
          title: 'Zurich JS Makes International & Local Friends',
          description: 'For our second meetup, we welcomed Evangelia who flew in specially from Thessaloniki, Greece. This month also marked the beginning of our valuable partnership with Web Zurich!',
          image: '/images/community/meetup-2.png',
        },
        {
          year: 'March 2025',
          title: 'Partnerships to the Moon!',
          description: 'We expanded into the international conference scene, establishing partnerships with React Paris and Code Blossom, complementing our existing collaborations with CityJS and Grusp.',
          image: '/images/community/meetup-3.jpeg',
        },
        {
          year: 'March 2025',
          title: 'ZurichJS x Vue Zurich',
          description: 'We proudly merged with the Vue Zurich meetup, welcoming their community into ours. We celebrated with Adam Berecz, a distinguished Vue.js expert from Hungary and founder of Vueform, as our featured speaker.',
          image: '/images/community/vue-zurich.jpeg',
        },
        {
          year: 'April 2025',
          title: 'ZurichJS Comes to Smallpdf',
          description: 'Smallpdf graciously hosted our 4th meetup, joining our roster of generous venue partners alongside Ginetta, novu ag, and GetYourGuide in Zurich.',
          image: '/images/community/meetup-3-crowd.jpg',
        },
      ],
      stats
    },
  };
}