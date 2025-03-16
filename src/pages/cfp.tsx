import { useState, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, Clock, CheckCircle, Calendar, Users, Tag, Upload } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import useEvents from '@/hooks/useEvents';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { FeatureFlags } from '@/constants';

interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
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
    linkedinProfile: '',
    githubProfile: '',
    twitterHandle: '',
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
        !formState.linkedinProfile || !formState.jobTitle || 
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
      formData.append('linkedinProfile', formState.linkedinProfile);
      formData.append('githubProfile', formState.githubProfile || '');
      formData.append('twitterHandle', formState.twitterHandle || '');
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

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 mr-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-4xl md:text-5xl font-bold mb-3 md:mb-4">
                    Call for Papers 🎤
                  </h1>
                  <p className="text-lg md:text-xl mb-4 md:mb-6">
                    Share your JavaScript knowledge with the ZurichJS community!
                  </p>
                  <p className="text-base md:text-lg mb-6 md:mb-8">
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
                  <div className="flex flex-col sm:flex-row gap-6">
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
                  We offer slots for lightning talks (5 min) and standard talks (25 min)
                  {showDeepDiveOption ? ', and deep dives (35 min)' : '.'}
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
                  encType="multipart/form-data"
                >
                  {formState.error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
                      {formState.error}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Speaker Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="firstName" className="block text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formState.firstName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formState.lastName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="jobTitle" className="block text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        id="jobTitle"
                        name="jobTitle"
                        value={formState.jobTitle}
                        onChange={handleInputChange}
                        placeholder="Senior Frontend Developer, Tech Lead, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
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
                    
                    <div className="mb-4">
                      <label htmlFor="linkedinProfile" className="block text-gray-700 mb-2">
                        LinkedIn Profile URL *
                      </label>
                      <input
                        type="url"
                        id="linkedinProfile"
                        name="linkedinProfile"
                        value={formState.linkedinProfile}
                        onChange={handleInputChange}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="githubProfile" className="block text-gray-700 mb-2">
                          GitHub Profile (optional)
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
                          Twitter Handle (optional)
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
                    <label htmlFor="speakerImage" className="block text-gray-700 mb-2">
                      Profile Image *
                    </label>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <label 
                          htmlFor="speakerImage" 
                          className="flex items-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                        >
                          <Upload size={18} />
                          <span>{formState.speakerImage ? formState.speakerImage.name : 'Choose an image'}</span>
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
                        <div className="ml-4 w-16 h-16 relative flex-shrink-0">
                          <img 
                            src={formState.imagePreview} 
                            alt="Profile preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Recommended: Square image, at least 400x400px</p>
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
                          <option value="5">Lightning Talk (5 min)</option>
                          <option value="25">Standard Talk (25 min)</option>
                          {showDeepDiveOption && (
                            <option value="35">Deep Dive (35 min)</option>
                          )}
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
                          className={`cursor-pointer flex items-center px-3 py-1.5 rounded-full ${formState.topics.includes(topic)
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
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={formState.isSubmitting}
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
                        'Submit Your Talk 🎤'
                      )}
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