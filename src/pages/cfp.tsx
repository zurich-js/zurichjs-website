import { motion } from 'framer-motion';
import { Mic, FileText, Clock, CheckCircle, Calendar, Users, Tag, Upload, User, Lightbulb, Award } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState, ChangeEvent, FormEvent } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { FeatureFlags } from '@/constants';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';

interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  bio: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
  website: string;
  speakerImage: File | null;
  title: string;
  description: string;
  talkLength: string;
  talkLevel: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  submitted: boolean;
  isSubmitting: boolean;
  error: string;
  imagePreview: string | null;
}

export default function CFP() {
  useReferrerTracking();
  const { track } = useEvents();
  const showDeepDiveOption = useFeatureFlagEnabled(FeatureFlags.CfpDeepDiveOption);

  const [formState, setFormState] = useState<FormState>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    bio: '',
    linkedinProfile: '',
    githubProfile: '',
    twitterHandle: '',
    website: '',
    speakerImage: null,
    title: '',
    description: '',
    talkLength: '25',
    talkLevel: 'intermediate',
    topics: [],
    submitted: false,
    isSubmitting: false,
    error: '',
    imagePreview: null,
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

    // Track topic selection/deselection
    track('topic_selection', {
      action: formState.topics.includes(topic) ? 'deselect' : 'select',
      topic: topic
    });

    setFormState((prev) => ({ ...prev, topics: newTopics }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);

      // Track image upload
      track('image_upload', {
        fileSize: file.size,
        fileType: file.type
      });

      setFormState((prev) => ({
        ...prev,
        speakerImage: file,
        imagePreview: previewUrl
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Form validation
    if (!formState.firstName || !formState.lastName || !formState.email ||
        !formState.linkedinProfile || !formState.jobTitle || !formState.bio ||
        !formState.title || !formState.description || !formState.speakerImage) {

      // Track validation error
      track('form_error', {
        errorType: 'missing_required_fields'
      });

      setFormState((prev) => ({ ...prev, error: 'Please fill out all required fields' }));
      return;
    }

    if (formState.topics.length === 0) {
      // Track validation error
      track('form_error', {
        errorType: 'no_topics_selected'
      });

      setFormState((prev) => ({ ...prev, error: 'Please select at least one topic' }));
      return;
    }

    // Set loading state
    setFormState((prev) => ({ ...prev, isSubmitting: true, error: '' }));

    try {
      // Create form data for file upload
      const formData = new FormData();

      // Combine first and last name
      const fullName = `${formState.firstName} ${formState.lastName}`;

      // Add all form fields to formData
      formData.append('name', fullName);
      formData.append('firstName', formState.firstName);
      formData.append('lastName', formState.lastName);
      formData.append('jobTitle', formState.jobTitle);
      formData.append('email', formState.email);
      formData.append('bio', formState.bio);
      formData.append('linkedinProfile', formState.linkedinProfile);
      formData.append('githubProfile', formState.githubProfile || '');
      formData.append('twitterHandle', formState.twitterHandle || '');
      formData.append('website', formState.website || '');
      formData.append('title', formState.title);
      formData.append('description', formState.description);
      formData.append('talkLength', formState.talkLength);
      formData.append('talkLevel', formState.talkLevel);
      formData.append('topics', JSON.stringify(formState.topics));

      // Add the image if one was selected
      if (formState.speakerImage) {
        formData.append('speakerImage', formState.speakerImage);
      }

      // Track form submission attempt
      track('form_submit', {
        talkLength: formState.talkLength,
        talkLevel: formState.talkLevel,
        topicsCount: formState.topics.length
      });

      // Submit to our API endpoint
      const response = await fetch('/api/submit-talk', {
        method: 'POST',
        body: formData, // Using FormData instead of JSON
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while submitting your talk');
      }

      // Track successful submission
      track('form_submit_success', {
        talkTitle: formState.title
      });

      // Show success state
      setFormState((prev) => ({
        ...prev,
        submitted: true,
        isSubmitting: false,
        error: ''
      }));

    } catch (error: unknown) {
      console.error('Submission error:', error);

      // Track submission error
      track('form_submit_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An error occurred while submitting your talk'
      }));
    }
  };

  return (
    <Layout>
      <SEO
        title="Submit a Talk | ZurichJS"
        description="Submit your talk proposal for an upcoming ZurichJS meetup. Share your JavaScript knowledge with the community!"
        openGraph={{
          title: "Submit a Talk | ZurichJS",
          description: "Share your JavaScript knowledge with the ZurichJS community by submitting a talk proposal for our upcoming meetups.",
          image: "/api/og/cfp",
          type: "website"
        }}
      />

      {/* Hero Section */}
      <Section variant="gradient" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Mic size={16} className="text-yellow-400" />
              <span className="text-sm font-medium text-black">Call for Papers</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-black">
              Share Your Story
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              Join the ZurichJS community as a speaker and inspire fellow developers with your knowledge and experiences.
            </p>
                         <p className="text-lg text-gray-500 max-w-2xl mx-auto">
               Whether you&apos;re sharing a breakthrough, a hard-learned lesson, or an innovative solution, 
               we want to hear your unique perspective on JavaScript and web development.
             </p>
          </motion.div>

          {/* Benefits Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl p-8 hover:bg-white/25 transition-all duration-300 shadow-lg">
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 w-fit mb-6">
                <Lightbulb className="text-gray-800" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Share Your Expertise</h3>
              <p className="text-gray-700 leading-relaxed">Help others learn from your experiences and insights in JavaScript development</p>
            </div>
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl p-8 hover:bg-white/25 transition-all duration-300 shadow-lg">
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 w-fit mb-6">
                <Users className="text-gray-800" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Build Your Network</h3>
              <p className="text-gray-700 leading-relaxed">Connect with like-minded developers and expand your professional circle</p>
            </div>
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl p-8 hover:bg-white/25 transition-all duration-300 shadow-lg">
              <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 w-fit mb-6">
                <Award className="text-gray-800" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Grow Your Profile</h3>
              <p className="text-gray-700 leading-relaxed">Establish yourself as a thought leader and boost your professional reputation</p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Submission Guidelines */}
      <Section variant="white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">What We&apos;re Looking For</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We welcome talks that inspire, educate, and spark meaningful conversations about JavaScript and web development.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-2xl border border-yellow-200"
            >
              <div className="bg-yellow-100 rounded-xl p-3 w-fit mb-4">
                <FileText className="text-yellow-600" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Content Focus</h3>
              <p className="text-gray-700 mb-4">
                JavaScript, TypeScript, web frameworks, tooling, performance, accessibility, or any web technology that excites you.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-world case studies</li>
                <li>• Technical deep dives</li>
                <li>• Best practices & patterns</li>
                <li>• Industry trends & insights</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200"
            >
              <div className="bg-blue-100 rounded-xl p-3 w-fit mb-4">
                <Clock className="text-blue-600" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Talk Formats</h3>
              <p className="text-gray-700 mb-4">
                Choose the format that best fits your content and comfort level.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Lightning (5 min):</strong> Quick insights or demos</li>
                <li>• <strong>Standard (25 min):</strong> Comprehensive topic coverage</li>
                {showDeepDiveOption && (
                  <li>• <strong>Deep Dive (35 min):</strong> In-depth technical exploration</li>
                )}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-200"
            >
              <div className="bg-green-100 rounded-xl p-3 w-fit mb-4">
                <Calendar className="text-green-600" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Our Process</h3>
              <p className="text-gray-700 mb-4">
                We review all submissions carefully and provide feedback within 2 weeks.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Submit your proposal</li>
                <li>• We review & provide feedback</li>
                <li>• Schedule your talk</li>
                <li>• Share your knowledge!</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Submission Form */}
      <Section variant="gray">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Submit Your Talk Proposal</h2>
            <p className="text-xl text-gray-600">
              Ready to share your expertise? Fill out the form below and join our amazing speaker lineup.
            </p>
          </motion.div>

          {formState.submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-12 rounded-3xl text-center"
            >
              <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-6">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-green-800 mb-4">Thank You for Your Submission!</h3>
              <p className="text-lg text-green-700 mb-6 max-w-2xl mx-auto">
                We&apos;ve received your talk proposal and we&apos;re excited to review it. Our team will get back to you within 2 weeks with next steps.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button href="/" variant="secondary" size="lg">
                  Return to Homepage
                </Button>
                <Button href="/speakers" variant="primary" size="lg">
                  Meet Our Speakers
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl shadow-xl overflow-hidden"
              encType="multipart/form-data"
            >
              {formState.error && (
                <div className="mx-8 mt-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {formState.error}
                </div>
              )}

              {/* Speaker Information Section */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 rounded-xl p-2">
                    <User className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-2xl font-bold">Speaker Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formState.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formState.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={formState.jobTitle}
                    onChange={handleInputChange}
                    placeholder="e.g., Senior Frontend Developer, Tech Lead, Full-Stack Engineer"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="mt-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="mt-6">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                    Speaker Bio *
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formState.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-vertical"
                    placeholder="Tell us about yourself, your experience, and what you're passionate about. This will be used in your speaker profile and event announcements."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">This bio will be displayed on your speaker profile and in event materials.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label htmlFor="linkedinProfile" className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn Profile *
                    </label>
                    <input
                      type="url"
                      id="linkedinProfile"
                      name="linkedinProfile"
                      value={formState.linkedinProfile}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/your-profile"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formState.website}
                      onChange={handleInputChange}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label htmlFor="githubProfile" className="block text-sm font-medium text-gray-700 mb-2">
                      GitHub Profile
                    </label>
                    <input
                      type="text"
                      id="githubProfile"
                      name="githubProfile"
                      value={formState.githubProfile}
                      onChange={handleInputChange}
                      placeholder="username"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="twitterHandle" className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter/X Handle
                    </label>
                    <input
                      type="text"
                      id="twitterHandle"
                      name="twitterHandle"
                      value={formState.twitterHandle}
                      onChange={handleInputChange}
                      placeholder="@username"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="speakerImage" className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo *
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <label
                        htmlFor="speakerImage"
                        className="flex items-center justify-center gap-3 w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload size={24} className="text-gray-400" />
                        <div className="text-center">
                          <div className="font-medium text-gray-700">
                            {formState.speakerImage ? formState.speakerImage.name : 'Click to upload your photo'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            PNG, JPG up to 10MB (recommended: 400x400px square)
                          </div>
                        </div>
                        <input
                          type="file"
                          id="speakerImage"
                          name="speakerImage"
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                          required
                        />
                      </label>
                    </div>

                    {formState.imagePreview && (
                      <div className="w-20 h-20 flex-shrink-0">
                        <img
                          src={formState.imagePreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover rounded-xl border-2 border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Talk Information Section */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 rounded-xl p-2">
                    <Mic className="text-green-600" size={20} />
                  </div>
                  <h3 className="text-2xl font-bold">Talk Information</h3>
                </div>

                <div className="mb-6">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Talk Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formState.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    placeholder="Give your talk a compelling title that captures the main idea"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Talk Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formState.description}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-vertical"
                    placeholder="Describe your talk in detail. What will attendees learn? What problems does it solve? Include key takeaways and any demos or examples you plan to show."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">This description will be used to promote your talk to attendees.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="talkLength" className="block text-sm font-medium text-gray-700 mb-2">
                      Talk Format *
                    </label>
                    <select
                      id="talkLength"
                      name="talkLength"
                      value={formState.talkLength}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="5">⚡ Lightning Talk (5 min)</option>
                      <option value="25">🎯 Standard Talk (25 min)</option>
                      {showDeepDiveOption && (
                        <option value="35">🔍 Deep Dive (35 min)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="talkLevel" className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience *
                    </label>
                    <select
                      id="talkLevel"
                      name="talkLevel"
                      value={formState.talkLevel}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="beginner">🌱 Beginner-friendly</option>
                      <option value="intermediate">🚀 Intermediate</option>
                      <option value="advanced">⚡ Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Talk Topics * <span className="text-gray-500">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {talkTopics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleTopicChange(topic)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                          formState.topics.includes(topic)
                            ? 'bg-yellow-500 border-yellow-500 text-black font-medium'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <Tag size={14} />
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={formState.isSubmitting}
                    className="min-w-[200px]"
                  >
                    {formState.isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Your Talk Proposal 🚀'
                    )}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </div>
      </Section>
    </Layout>
  );
}
