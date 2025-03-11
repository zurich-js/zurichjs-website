import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, ExternalLink, Twitter, Github, Linkedin, Video, FileText } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

export default function SpeakerDetail({ speaker }) {
  const router = useRouter();

  // Show loading state while fetching data
  if (router.isFallback) {
    return (
      <Layout>
        <div className="pt-32 pb-20 text-center">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{speaker.name} | Speaker | ZurichJS</title>
        <meta name="description" content={`${speaker.name} is a speaker at ZurichJS. Learn more about their talks and expertise in JavaScript.`} />
      </Head>

      <div className="pt-20">
        {/* Speaker Hero Section */}
        <section className="bg-yellow-400 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="md:w-1/3 h-80 md:h-auto relative">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                >
                  <Image
                    src={speaker.image}
                    alt={speaker.name}
                    fill
                    className="object-cover"
                  />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:w-2/3 p-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold">{speaker.name}</h1>
                    <p className="text-gray-600 mt-1">{speaker.title}</p>
                  </div>
                  <div className="flex space-x-4 mt-4 md:mt-0">
                    {speaker.twitter && (
                      <a 
                        href={`https://twitter.com/${speaker.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-400 transition-colors"
                        aria-label="Twitter profile"
                      >
                        <Twitter size={22} />
                      </a>
                    )}
                    {speaker.github && (
                      <a 
                        href={`https://github.com/${speaker.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-black transition-colors"
                        aria-label="GitHub profile"
                      >
                        <Github size={22} />
                      </a>
                    )}
                    {speaker.linkedin && (
                      <a 
                        href={speaker.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-700 transition-colors"
                        aria-label="LinkedIn profile"
                      >
                        <Linkedin size={22} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-gray-700 mb-8">
                  <p className="md:text-lg">{speaker.bio}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {speaker.skills && speaker.skills.map((skill) => (
                    <span 
                      key={skill}
                      className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Talks Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-8">Talks by {speaker.name} 🎤</h2>
            </motion.div>

            <div className="space-y-8">
              {speaker.talks.map((talk, index) => (
                <motion.div
                  key={talk.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg shadow-md overflow-hidden"
                >
                  <div className="md:flex">
                    {talk.coverImage && (
                      <div className="md:w-1/4 h-48 md:h-auto relative">
                        <Image
                          src={talk.coverImage}
                          alt={talk.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className={`p-6 ${talk.coverImage ? 'md:w-3/4' : 'w-full'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
                        <h3 className="text-xl font-bold">{talk.title}</h3>
                        <div className="mt-2 md:mt-0">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            talk.upcoming 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {talk.upcoming ? 'Upcoming' : 'Past Talk'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center text-gray-500 gap-x-4 gap-y-2 mb-4">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-1" />
                          <span className="text-sm">{talk.date}</span>
                        </div>
                        {talk.location && (
                          <div className="flex items-center">
                            <MapPin size={16} className="mr-1" />
                            <span className="text-sm">{talk.location}</span>
                          </div>
                        )}
                        {talk.duration && (
                          <div className="flex items-center">
                            <Clock size={16} className="mr-1" />
                            <span className="text-sm">{talk.duration} min</span>
                          </div>
                        )}
                      </div>

                      {talk.description && (
                        <p className="text-gray-700 mb-4">{talk.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        {talk.eventId && (
                          <Link 
                            href={`/events/${talk.eventId}`}
                            className="flex items-center text-yellow-600 hover:text-yellow-700 font-medium"
                          >
                            Event Details <ExternalLink size={16} className="ml-1" />
                          </Link>
                        )}
                        {talk.slidesUrl && (
                          <a 
                            href={talk.slidesUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Slides <FileText size={16} className="ml-1" />
                          </a>
                        )}
                        {talk.videoUrl && (
                          <a 
                            href={talk.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-red-600 hover:text-red-700 font-medium"
                          >
                            Watch Video <Video size={16} className="ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-yellow-400 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="md:flex">
                <div className="md:w-2/3 p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">Want to be our next speaker? 🎤</h2>
                  <p className="text-lg mb-6">
                    If you're passionate about JavaScript and have knowledge to share, we'd love to have you speak at one of our upcoming meetups!
                  </p>
                  <Button href="/cfp" variant="primary" size="lg" className="bg-black text-yellow-400 hover:bg-gray-800">
                    Submit Your Talk Proposal 🚀
                  </Button>
                </div>
                <div className="md:w-1/3 relative hidden md:block">
                  <div className="absolute inset-0 bg-black opacity-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-7xl font-black text-white">JS</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

// This function would get a list of all speaker IDs from your CMS
export async function getStaticPaths() {
  // In a real application, this would fetch from your CMS
  const speakerIds = ['1', '2', '3', '4'];
  
  const paths = speakerIds.map((id) => ({
    params: { id },
  }));

  return {
    paths,
    fallback: true, // Show a loading state for speakers not generated at build time
  };
}

export async function getStaticProps({ params }) {
  // In a real application, this would fetch from your CMS based on the ID
  const speakers = {
    '1': {
      id: '1',
      name: 'Sarah Johnson',
      title: 'Senior Frontend Developer at TechCorp',
      image: '/images/speakers/speaker-1.jpg',
      bio: 'Sarah is a frontend specialist with expertise in React and modern JavaScript frameworks. With over 8 years of experience, she focuses on creating accessible, performant user interfaces. She's a regular contributor to open source projects and enjoys mentoring junior developers.',
      twitter: 'sarahjohnson',
      github: 'sarahj',
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      skills: ['React', 'JavaScript', 'TypeScript', 'CSS-in-JS', 'Web Accessibility'],
      talks: [
        {
          id: '101',
          title: 'Modern React Patterns for 2025',
          date: 'Jan 15, 2025',
          location: 'Ginetta, Zurich',
          duration: 30,
          description: 'An exploration of the latest React patterns and best practices, focusing on performance optimization and code organization for large-scale applications.',
          eventId: '8',
          slidesUrl: 'https://speakerdeck.com/sarahj/modern-react-patterns-2025',
          videoUrl: 'https://youtube.com/watch?v=example1',
          upcoming: false,
          coverImage: '/images/talks/react-patterns.jpg',
        }
      ]
    },
    '2': {
      id: '2',
      name: 'Michael Chen',
      title: 'JavaScript Architect at WebSolutions',
      image: '/images/speakers/speaker-2.jpg',
      bio: 'Michael specializes in building scalable backend systems with Node.js and has been working with JavaScript for over a decade. He's passionate about software architecture, performance optimization, and developer tooling. In his spare time, he contributes to various open-source projects and writes technical articles.',
      twitter: 'michaelchen',
      github: 'mchen',
      linkedin: 'https://linkedin.com/in/michaelchen',
      skills: ['Node.js', 'TypeScript', 'Microservices', 'GraphQL', 'Performance'],
      talks: [
        {
          id: '102',
          title: 'Building Scalable Node.js Applications',
          date: 'Nov 20, 2024',
          location: 'Smallpdf AG, Zurich',
          duration: 45,
          description: 'A deep dive into architectural patterns for scalable Node.js applications, covering microservices, caching strategies, and deployment best practices.',
          eventId: '7',
          slidesUrl: 'https://speakerdeck.com/mchen/scalable-nodejs',
          videoUrl: 'https://youtube.com/watch?v=example2',
          upcoming: false,
          coverImage: '/images/talks/nodejs-scaling.jpg',
        },
        {
          id: '103',
          title: 'TypeScript Best Practices for Large Teams',
          date: 'Jul 5, 2024',
          location: 'Google, Zurich',
          duration: 30,
          description: 'Practical strategies for using TypeScript effectively in large teams, including type safety, code organization, and ensuring consistency across codebases.',
          eventId: '5',
          slidesUrl: 'https://speakerdeck.com/mchen/typescript-best-practices',
          videoUrl: null,
          upcoming: false,
        }
      ]
    },
    '3': {
      id: '3',
      name: 'Anna Schmidt',
      title: 'React Team Lead at Startup.io',
      image: '/images/speakers/speaker-3.jpg',
      bio: 'Anna leads the frontend team at a fast-growing startup, where she implements modern React solutions and establishes engineering best practices. She has a background in UX design which informs her development approach, and she's particularly interested in state management solutions and component architecture.',
      twitter: 'annaschmidt',
      github: 'asc',
      linkedin: 'https://linkedin.com/in/annaschmidt',
      skills: ['React', 'Redux', 'State Management', 'Frontend Architecture', 'UI/UX'],
      talks: [
        {
          id: '104',
          title: 'State Management in 2025: Beyond Redux',
          date: 'Dec 10, 2024',
          location: 'Startup.io Office, Zurich',
          duration: 45,
          description: 'An overview of modern state management solutions for React applications, comparing traditional Redux with newer alternatives like Zustand, Jotai, and React Query.',
          eventId: '6',
          slidesUrl: 'https://speakerdeck.com/asc/state-management-2025',
          videoUrl: 'https://youtube.com/watch?v=example3',
          upcoming: false,
          coverImage: '/images/talks/state-management.jpg',
        },
        {
          id: '105',
          title: 'Building a Component Design System from Scratch',
          date: 'Mar 20, 2025',
          location: 'To be announced',
          duration: 30,
          description: 'A practical guide to creating a consistent, maintainable component design system for your organization, with tips on documentation, testing, and team adoption.',
          eventId: '9',
          slidesUrl: null,
          videoUrl: null,
          upcoming: true,
        }
      ]
    },
    '4': {
      id: '4',
      name: 'David Wilson',
      title: 'Full Stack Developer at CodeLabs',
      image: '/images/speakers/speaker-4.jpg',
      bio: 'David is a passionate JavaScript developer with over 10 years of experience building web applications. He specializes in frontend performance optimization and testing methodologies. Outside of work, he contributes to open source projects, writes technical articles, and enjoys hiking and playing guitar.',
      twitter: 'davidw',
      github: 'dwilson',
      linkedin: 'https://linkedin.com/in/davidwilson',
      skills: ['JavaScript', 'Web Performance', 'Testing', 'CSS', 'Full Stack'],
      talks: [
        {
          id: '105',
          title: 'Web Performance Optimization: Techniques for 2025',
          date: 'Feb 5, 2025',
          location: 'Ginetta, Zurich',
          duration: 45,
          description: 'A comprehensive guide to optimizing web application performance, covering loading strategies, rendering optimizations, and measuring performance metrics that matter to users.',
          eventId: '10',
          slidesUrl: 'https://speakerdeck.com/dwilson/web-performance-2025',
          videoUrl: null,
          upcoming: true,
          coverImage: '/images/talks/web-performance.jpg',
        },
        {
          id: '106',
          title: 'Testing JavaScript Applications: A Practical Approach',
          date: 'Sep 18, 2024',
          location: 'Smallpdf AG, Zurich',
          duration: 30,
          description: 'A hands-on guide to establishing a robust testing strategy for JavaScript applications, covering unit testing, integration testing, and end-to-end testing approaches.',
          eventId: '6',
          slidesUrl: 'https://speakerdeck.com/dwilson/testing-js-apps',
          videoUrl: 'https://youtube.com/watch?v=example4',
          upcoming: false,
        },
        {
          id: '107',
          title: 'CSS-in-JS Solutions Compared',
          date: 'Apr 22, 2024',
          location: 'Google, Zurich',
          duration: 30,
          description: 'An objective comparison of popular CSS-in-JS libraries, analyzing performance implications, developer experience, and best use cases for each approach.',
          eventId: '3',
          slidesUrl: 'https://speakerdeck.com/dwilson/css-in-js-compared',
          videoUrl: 'https://youtube.com/watch?v=example5',
          upcoming: false,
        }
      ]
    }
  };

  // Get the speaker data
  const speaker = speakers[params.id];

  // Handle case where speaker is not found
  if (!speaker) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      speaker,
    },
    // Re-generate the page at most once per day
    revalidate: 86400,
  };
}