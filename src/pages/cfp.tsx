import { useState, ChangeEvent, FormEvent } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Mic, FileText, Clock, CheckCircle, Calendar, Users, Tag } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

interface FormState {
  name: string;
  email: string;
  title: string;
  description: string;
  talkLength: string;
  talkLevel: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  githubProfile: string;
  twitterHandle: string;
  submitted: boolean;
  error: string;
}

export default function CFP() {
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    title: '',
    description: '',
    talkLength: '30',
    talkLevel: 'intermediate',
    topics: [],
    githubProfile: '',
    twitterHandle: '',
    submitted: false,
    error: '',
  });

  const talkTopics = [
    'JavaScript Fundamentals',
    'React',
    'Angular',
    'Vue',
    'Svelte',
    'Node.js',
    'TypeScript',
    'Testing',
    'Web Performance',
    'JavaScript Frameworks',
    'Frontend Development',
    'Backend Development',
    'Web3',
    'AI in JavaScript',
    'Tooling',
    'DevOps',
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleTopicChange = (topic: string) => {
    const newTopics = formState.topics.includes(topic)
      ? formState.topics.filter((t) => t !== topic)
      : [...formState.topics, topic];
    setFormState((prev) => ({ ...prev, topics: newTopics }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Here you would connect to your API or CMS to save the submission
    
    // Form validation
    if (!formState.name || !formState.email || !formState.title || !formState.description) {
      setFormState((prev) => ({ ...prev, error: 'Please fill out all required fields' }));
      return;
    }
    
    if (formState.topics.length === 0) {
      setFormState((prev) => ({ ...prev, error: 'Please select at least one topic' }));
      return;
    }
    
    // Simulate successful submission
    setFormState((prev) => ({ ...prev, submitted: true, error: '' }));
    
    // In reality, you would submit to your API here
    // submitToCMS(formState);
  };

  return (
    <Layout>
      <Head>
        <title>Submit a Talk | ZurichJS</title>
        <meta name="description" content="Submit your talk proposal for an upcoming ZurichJS meetup. Share your JavaScript knowledge with the community!" />
      </Head>

      <div className="pt-20 bg-gray-50">
        {/* Hero Section */}
        <section className="bg-yellow-400 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Call for Papers 🎤
                  </h1>
                  <p className="text-xl mb-6">
                    Share your JavaScript knowledge with the ZurichJS community!
                  </p>
                  <p className="text-lg mb-8">
                    We&apos;re constantly looking for speakers for our upcoming meetups. 
                    Whether you&apos;re a seasoned presenter or a first-timer, we&apos;d love to hear from you!
                  </p>
                </motion.div>
              </div>
              <div className="md:w-1/2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white p-8 rounded-lg shadow-lg"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-start">
                      <Mic className="text-yellow-500 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold">Share Your Expertise</h3>
                        <p className="text-gray-600">Help others learn from your experiences and insights</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Users className="text-yellow-500 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold">Build Your Network</h3>
                        <p className="text-gray-600">Connect with like-minded developers in the community</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Submission Guidelines */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">Submission Guidelines ✨</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Here&apos;s what you need to know before submitting your talk proposal.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200"
              >
                <FileText className="text-yellow-500 mb-4" size={32} />
                <h3 className="text-xl font-bold mb-2">Talk Content</h3>
                <p className="text-gray-600">
                  Your talk should focus on JavaScript or related web technologies. 
                  We welcome topics from beginner to advanced levels.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200"
              >
                <Clock className="text-yellow-500 mb-4" size={32} />
                <h3 className="text-xl font-bold mb-2">Talk Length</h3>
                <p className="text-gray-600">
                  We offer slots for lightning talks (10 min), standard talks (30 min), 
                  and deep dives (45 min).
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200"
              >
                <Calendar className="text-yellow-500 mb-4" size={32} />
                <h3 className="text-xl font-bold mb-2">Upcoming Events</h3>
                <p className="text-gray-600">
                  We typically host meetups monthly. Your talk will be scheduled 
                  based on the theme and availability.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Submission Form */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-6">Submit Your Talk 🚀</h2>

              {formState.submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
                >
                  <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold mb-2">Thank You for Your Submission!</h3>
                  <p className="mb-6">
                    We&apos;ve received your talk proposal and will review it shortly. 
                    Our team will contact you within the next 2 weeks regarding the status of your submission.
                  </p>
                  <Button href="/" variant="secondary">
                    Return to Homepage
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  onSubmit={handleSubmit}
                  className="bg-white p-8 rounded-lg shadow-md"
                >
                  {formState.error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
                      {formState.error}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Speaker Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-gray-700 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formState.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formState.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="githubProfile" className="block text-gray-700 mb-2">
                          GitHub Profile
                        </label>
                        <input
                          type="text"
                          id="githubProfile"
                          name="githubProfile"
                          value={formState.githubProfile}
                          onChange={handleInputChange}
                          placeholder="username"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="twitterHandle" className="block text-gray-700 mb-2">
                          Twitter Handle
                        </label>
                        <input
                          type="text"
                          id="twitterHandle"
                          name="twitterHandle"
                          value={formState.twitterHandle}
                          onChange={handleInputChange}
                          placeholder="@username"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Talk Details</h3>
                    <div className="mb-4">
                      <label htmlFor="title" className="block text-gray-700 mb-2">
                        Talk Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formState.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="description" className="block text-gray-700 mb-2">
                        Talk Description *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formState.description}
                        onChange={handleInputChange}
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                        placeholder="Tell us about your talk idea and what attendees will learn..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="talkLength" className="block text-gray-700 mb-2">
                          Talk Length *
                        </label>
                        <select
                          id="talkLength"
                          name="talkLength"
                          value={formState.talkLength}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        >
                          <option value="10">Lightning Talk (10 min)</option>
                          <option value="30">Standard Talk (30 min)</option>
                          <option value="45">Deep Dive (45 min)</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="talkLevel" className="block text-gray-700 mb-2">
                          Talk Level *
                        </label>
                        <select
                          id="talkLevel"
                          name="talkLevel"
                          value={formState.talkLevel}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        >
                          <option value="beginner">Beginner-friendly</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-gray-700 mb-2">
                      Talk Topics * (select at least one)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {talkTopics.map((topic) => (
                        <div
                          key={topic}
                          onClick={() => handleTopicChange(topic)}
                          className={`cursor-pointer flex items-center px-3 py-1.5 rounded-full ${
                            formState.topics.includes(topic)
                              ? 'bg-yellow-400 text-black'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Tag size={14} className="mr-1" />
                          {topic}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="lg">
                      Submit Your Talk 🎤
                    </Button>
                  </div>
                </motion.form>
              )}
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}