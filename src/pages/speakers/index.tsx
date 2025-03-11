import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ExternalLink, Twitter, Github, Linkedin } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

// Define our TypeScript interfaces
interface Talk {
  id: string;
  title: string;
  date: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  talks: Talk[];
}

interface LatestTalk extends Talk {
  eventId: string;
  location: string;
}

interface FeaturedSpeaker extends Speaker {
  bio: string;
  latestTalk: LatestTalk;
}

interface SpeakersProps {
  speakers: Speaker[];
  featuredSpeaker?: FeaturedSpeaker;
}

export default function Speakers({ speakers, featuredSpeaker }: SpeakersProps) {
  // Add client-side state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Set isClient to true once component mounts on the client
    setIsClient(true);
  }, []);

  return (
    <Layout>
      <Head>
        <title>Speakers | ZurichJS</title>
        <meta name="description" content="Meet the amazing speakers who have shared their JavaScript knowledge at ZurichJS meetups." />
      </Head>

      <div className="pt-20">
        {/* Hero Section with Featured Speaker */}
        <section className="bg-yellow-400 py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Our Amazing Speakers 🎤
              </h1>
              <p className="text-xl max-w-2xl mx-auto">
                Meet the talented developers who have shared their JavaScript expertise at ZurichJS meetups!
              </p>
            </motion.div>

            {/* Only render featured speaker on client-side to prevent hydration mismatch */}
            {isClient && featuredSpeaker && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-xl shadow-xl overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 h-64 md:h-auto relative">
                    <Image
                      src={featuredSpeaker.image}
                      alt={featuredSpeaker.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="md:w-2/3 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div>
                        <span className="inline-block bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                          Featured Speaker
                        </span>
                        <h2 className="text-3xl font-bold">{featuredSpeaker.name}</h2>
                        <p className="text-gray-600">{featuredSpeaker.title}</p>
                      </div>
                      <div className="flex space-x-3 mt-4 md:mt-0">
                        {featuredSpeaker.twitter && (
                          <a 
                            href={`https://twitter.com/${featuredSpeaker.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-blue-400"
                            aria-label="Twitter profile"
                          >
                            <Twitter size={20} />
                          </a>
                        )}
                        {featuredSpeaker.github && (
                          <a 
                            href={`https://github.com/${featuredSpeaker.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-black"
                            aria-label="GitHub profile"
                          >
                            <Github size={20} />
                          </a>
                        )}
                        {featuredSpeaker.linkedin && (
                          <a 
                            href={featuredSpeaker.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-blue-700"
                            aria-label="LinkedIn profile"
                          >
                            <Linkedin size={20} />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-6">{featuredSpeaker.bio}</p>
                    
                    <div className="mb-6">
                      <h3 className="font-bold mb-2">Latest Talk:</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <Link href={`/events/${featuredSpeaker.latestTalk.eventId}`} className="text-lg font-medium hover:text-yellow-600">
                          {featuredSpeaker.latestTalk.title}
                        </Link>
                        <div className="flex items-center text-gray-500 mt-2">
                          <Calendar size={16} className="mr-1" />
                          <span className="text-sm mr-4">{featuredSpeaker.latestTalk.date}</span>
                          <MapPin size={16} className="mr-1" />
                          <span className="text-sm">{featuredSpeaker.latestTalk.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/speakers/${featuredSpeaker.id}`} className="text-yellow-600 hover:text-yellow-700 font-medium flex items-center">
                      View all talks by {featuredSpeaker.name} <ExternalLink size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* All Speakers Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10"
            >
              <div>
                <h2 className="text-3xl font-bold mb-2">Past & Upcoming Speakers</h2>
                <p className="text-gray-600">
                  All the amazing talent who has been on the ZurichJS stage!
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button href="/cfp" variant="secondary">
                  Become a Speaker 🎤
                </Button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {speakers.map((speaker, index) => (
                <motion.div
                  key={speaker.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index % 4 * 0.1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <Link href={`/speakers/${speaker.id}`} className="block">
                    <div className="relative h-64 w-full">
                      <Image
                        src={speaker.image}
                        alt={speaker.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{speaker.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{speaker.title}</p>
                      
                      {/* Only render this on client-side to prevent hydration mismatch */}
                      {isClient && (
                        <div className="flex justify-between items-center">
                          <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            {speaker.talks.length} {speaker.talks.length === 1 ? 'talk' : 'talks'}
                          </div>
                          <div className="flex space-x-2">
                            {speaker.twitter && (
                              <a 
                                href={`https://twitter.com/${speaker.twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-blue-400"
                                aria-label="Twitter profile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Twitter size={16} />
                              </a>
                            )}
                            {speaker.github && (
                              <a 
                                href={`https://github.com/${speaker.github}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-black"
                                aria-label="GitHub profile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Github size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-xl shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Ready to Share Your JavaScript Knowledge? 💡</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                Join our lineup of amazing speakers! Submit your talk proposal and inspire the ZurichJS community.
              </p>
              <Button href="/cfp" variant="primary" size="lg" className="bg-yellow-400 text-black hover:bg-yellow-300">
                Submit a Talk Proposal 🚀
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // This would be replaced with actual CMS fetching logic
  return {
    props: {
      speakers: [
        {
          id: '1',
          name: 'Sarah Johnson',
          title: 'Senior Frontend Developer at TechCorp',
          image: '/images/speakers/speaker-1.jpg',
          twitter: 'sarahjohnson',
          github: 'sarahj',
          talks: [
            {
              id: '101',
              title: 'Modern React Patterns',
              date: 'Jan 15, 2025',
            }
          ],
        },
        {
          id: '2',
          name: 'Michael Chen',
          title: 'JavaScript Architect at WebSolutions',
          image: '/images/speakers/speaker-2.jpg',
          twitter: 'michaelchen',
          github: 'mchen',
          talks: [
            {
              id: '102',
              title: 'Building Scalable Node.js Applications',
              date: 'Nov 20, 2024',
            },
            {
              id: '103',
              title: 'TypeScript Best Practices',
              date: 'Jul 5, 2024',
            }
          ],
        },
        {
          id: '3',
          name: 'Anna Schmidt',
          title: 'React Team Lead at Startup.io',
          image: '/images/speakers/speaker-3.jpg',
          twitter: 'annaschmidt',
          github: 'asc',
          talks: [
            {
              id: '104',
              title: 'State Management in 2025',
              date: 'Dec 10, 2024',
            }
          ],
        },
        {
          id: '4',
          name: 'David Wilson',
          title: 'Full Stack Developer at CodeLabs',
          image: '/images/speakers/speaker-4.jpg',
          twitter: 'davidw',
          github: 'dwilson',
          talks: [
            {
              id: '105',
              title: 'Web Performance Optimization',
              date: 'Feb 5, 2025',
            },
            {
              id: '106',
              title: 'Testing JavaScript Applications',
              date: 'Sep 18, 2024',
            },
            {
              id: '107',
              title: 'CSS-in-JS Solutions Compared',
              date: 'Apr 22, 2024',
            }
          ],
        },
        {
          id: '5',
          name: 'Laura Müller',
          title: 'Frontend Developer at SwissTech',
          image: '/images/speakers/speaker-5.jpg',
          twitter: 'lauramueller',
          github: 'lmueller',
          talks: [
            {
              id: '108',
              title: 'Svelte for React Developers',
              date: 'Oct 7, 2024',
            }
          ],
        },
        {
          id: '6',
          name: 'Robert Zhang',
          title: 'Engineering Manager at GlobalApp',
          image: '/images/speakers/speaker-6.jpg',
          twitter: 'robzhang',
          github: 'rzhang',
          talks: [
            {
              id: '109',
              title: 'Building Micro-Frontends',
              date: 'Aug 15, 2024',
            },
            {
              id: '110',
              title: 'JavaScript Monorepos',
              date: 'Mar 3, 2024',
            }
          ],
        },
        {
          id: '7',
          name: 'Sophie Dupont',
          title: 'UX Engineer at DesignFirm',
          image: '/images/speakers/speaker-7.jpg',
          twitter: 'sophiedupont',
          github: 'sdupont',
          talks: [
            {
              id: '111',
              title: 'Animations with Framer Motion',
              date: 'Jun 12, 2024',
            }
          ],
        },
        {
          id: '8',
          name: 'James Thompson',
          title: 'Vue.js Expert at AppStudio',
          image: '/images/speakers/speaker-8.jpg',
          twitter: 'jamesthompson',
          github: 'jthompson',
          talks: [
            {
              id: '112',
              title: 'Vue.js 4 Deep Dive',
              date: 'Jan 30, 2025',
            }
          ],
        },
      ],
      featuredSpeaker: {
        id: '4',
        name: 'David Wilson',
        title: 'Full Stack Developer at CodeLabs',
        image: '/images/speakers/speaker-4.jpg',
        twitter: 'davidw',
        github: 'dwilson',
        linkedin: 'https://linkedin.com/in/davidwilson',
        bio: 'David is a passionate JavaScript developer with over 10 years of experience building web applications. He specializes in frontend performance optimization and testing methodologies. When not coding, he enjoys hiking and playing the guitar.',
        latestTalk: {
          title: 'Web Performance Optimization: Techniques for 2025',
          eventId: '10',
          date: 'Feb 5, 2025',
          location: 'Ginetta, Zurich'
        },
        talks: [
          {
            id: '105',
            title: 'Web Performance Optimization',
            date: 'Feb 5, 2025',
          },
          {
            id: '106',
            title: 'Testing JavaScript Applications',
            date: 'Sep 18, 2024',
          },
          {
            id: '107',
            title: 'CSS-in-JS Solutions Compared',
            date: 'Apr 22, 2024',
          }
        ],
      }
    },
  };
}