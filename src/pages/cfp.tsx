import { motion } from 'framer-motion';
import { Mic, FileText, Clock, CheckCircle, Calendar, Users, Tag, Upload, Save, TrendingUp, MessageCircle } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { FeatureFlags } from '@/constants';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getTalkSubmissionStats, TalkSubmissionStats } from '@/sanity/queries';



interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  biography: string;
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

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  biography?: string;
  email?: string;
  linkedinProfile?: string;
  title?: string;
  description?: string;
  speakerImage?: string;
  topics?: string;
}

const STORAGE_KEY = 'zurichjs-cfp-form';

interface CFPProps {
  submissionStats?: TalkSubmissionStats;
}

export default function CFP({ submissionStats }: CFPProps) {
  useReferrerTracking();
  const { track } = useEvents();
  const showDeepDiveOption = useFeatureFlagEnabled(FeatureFlags.CfpDeepDiveOption);

  const [formState, setFormState] = useState<FormState>({
    firstName: '',
    lastName: '',
    jobTitle: '',
    biography: '',
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

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Helper function to generate email body with current form data
  const generateEmailBody = () => {
    const completedFields = [];
    const missingFields = [];

    // Check which fields are completed
    if (formState.firstName.trim()) completedFields.push(`First Name: ${formState.firstName}`);
    else missingFields.push('First Name');

    if (formState.lastName.trim()) completedFields.push(`Last Name: ${formState.lastName}`);
    else missingFields.push('Last Name');

    if (formState.jobTitle.trim()) completedFields.push(`Job Title: ${formState.jobTitle}`);
    else missingFields.push('Job Title');

    if (formState.biography.trim()) completedFields.push(`Biography: ${formState.biography}`);
    else missingFields.push('Biography');

    if (formState.email.trim()) completedFields.push(`Email: ${formState.email}`);
    else missingFields.push('Email');

    if (formState.linkedinProfile.trim()) completedFields.push(`LinkedIn: ${formState.linkedinProfile}`);
    else missingFields.push('LinkedIn Profile');

    if (formState.githubProfile.trim()) completedFields.push(`GitHub: ${formState.githubProfile}`);
    if (formState.twitterHandle.trim()) completedFields.push(`Twitter: ${formState.twitterHandle}`);

    if (formState.title.trim()) completedFields.push(`Talk Title: ${formState.title}`);
    else missingFields.push('Talk Title');

    if (formState.description.trim()) completedFields.push(`Talk Description: ${formState.description}`);
    else missingFields.push('Talk Description');

    completedFields.push(`Talk Length: ${formState.talkLength} minutes`);
    completedFields.push(`Talk Level: ${formState.talkLevel}`);

    if (formState.topics.length > 0) completedFields.push(`Topics: ${formState.topics.join(', ')}`);
    else missingFields.push('Talk Topics');

    if (!formState.speakerImage) missingFields.push('Profile Image');

    const emailBody = `Subject: CFP Submission - ${formState.title || 'Talk Proposal'} - ${formState.firstName} ${formState.lastName}

Hi ZurichJS Team,

I'd like to submit my talk proposal for an upcoming meetup. I encountered some issues with the online form, so I'm sending my information via email as suggested.

=== COMPLETED INFORMATION ===
${completedFields.join('\n')}

=== STILL NEED TO PROVIDE ===
${missingFields.join('\n')}

${formState.speakerImage ? '\n(Profile image attached separately)' : ''}

Looking forward to potentially speaking at ZurichJS!

Best regards,
${formState.firstName} ${formState.lastName}`;

    return encodeURIComponent(emailBody);
  };

  // Load saved form data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Don't restore submitted state or loading states
        const { lastSaved: savedTime, ...restoreableData } = parsedData;
        
        setFormState(prev => ({
          ...prev,
          ...restoreableData
        }));
        
        if (savedTime) {
          setLastSaved(new Date(savedTime));
        }
      } catch (error) {
        console.warn('Failed to restore form data:', error);
      }
    }
    setHasLoadedFromStorage(true);
  }, []);



  // Save form data to localStorage whenever it changes (except for loading/submitted states)
  useEffect(() => {
    if (!hasLoadedFromStorage || formState.submitted) return;
    
    // Check if form has any meaningful data
    const hasFormData = () => {
      return formState.firstName.trim() ||
             formState.lastName.trim() ||
             formState.jobTitle.trim() ||
             formState.biography.trim() ||
             formState.email.trim() ||
             formState.linkedinProfile.trim() ||
             formState.githubProfile.trim() ||
             formState.twitterHandle.trim() ||
             formState.title.trim() ||
             formState.description.trim() ||
             formState.talkLength !== '25' ||
             formState.talkLevel !== 'intermediate' ||
             formState.topics.length > 0;
    };
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Only show saving state and save if there's actual data
    if (hasFormData()) {
      setIsAutoSaving(true);
      
      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(() => {
        const { ...dataToSave } = formState;
        const dataWithTimestamp = {
          ...dataToSave,
          lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
        setLastSaved(new Date());
        setIsAutoSaving(false);
      }, 500); // Save after 500ms of no changes
    } else {
      // If no meaningful data, clear any existing saved data
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      setIsAutoSaving(false);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formState, hasLoadedFromStorage]);

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
    'Monetization',
    'Growth Hacking',
    'Product Management',
    'User Experience',
    'Analytics & Metrics',
    'A/B Testing',
    'Conversion Optimization',
    'Business Strategy',
    'Startup Journey',
    'Team Leadership',
    'Remote Work',
    'Career Development',
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
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

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!formState.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formState.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formState.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }
    
    if (!formState.biography.trim()) {
      errors.biography = 'Biography is required';
    }
    
    if (!formState.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formState.linkedinProfile.trim()) {
      errors.linkedinProfile = 'LinkedIn profile URL is required';
    } else if (!formState.linkedinProfile.includes('linkedin.com')) {
      errors.linkedinProfile = 'Please enter a valid LinkedIn profile URL';
    }
    
    if (!formState.title.trim()) {
      errors.title = 'Talk title is required';
    }
    
    if (!formState.description.trim()) {
      errors.description = 'Talk description is required';
    }
    
    if (!formState.speakerImage) {
      errors.speakerImage = 'Profile image is required';
    }
    
    if (formState.topics.length === 0) {
      errors.topics = 'Please select at least one topic';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      // Track validation error
      track('form_error', {
        errorType: 'validation_failed',
        errorFields: Object.keys(validationErrors).join(', ')
      });

      setFormState((prev) => ({ ...prev, error: 'Please fix the highlighted errors below' }));
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
      formData.append('biography', formState.biography);
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

      // Clear localStorage and show success state
      localStorage.removeItem(STORAGE_KEY);
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
        <div className="flex flex-col md:flex-row items-center lg:mt-20">
          <div className="md:w-1/2 mb-10 md:mb-0 mr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-3 md:mb-4">
                Call for Papers 🎤
              </h1>
              <p className="text-lg md:text-xl mb-4 md:mb-6 font-medium">
                Share your passion with Zurich&apos;s most vibrant developer community!
              </p>
              <p className="text-base md:text-lg mb-4 md:mb-6">
                We&apos;re constantly looking for speakers for our upcoming meetups.
                Whether you&apos;re a seasoned presenter or a first-timer, we&apos;d love to hear from you!
              </p>
              {submissionStats && (
                <div className="bg-js/20 backdrop-blur rounded-lg p-4 mb-6 md:mb-8 border border-js/30">
                  <p className="text-sm md:text-base font-medium text-black">
                    {submissionStats.recentSubmissions > 0 ? (
                      <>🚀 <strong>Join our amazing speaker community!</strong> We&apos;ve had {submissionStats.recentSubmissions} submissions in the last 90 days and our events are packed with incredible talent. Submit now to get in the queue!</>
                    ) : (
                      <>🎆 <strong>Perfect timing!</strong> There hasn&apos;t been a submission for a while - go for it! Your talk could be the next big hit at ZurichJS.</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button
                  href="#form"
                  variant="primary"
                  size="lg"
                  className="bg-black hover:bg-gray-800 text-white font-bold cursor-pointer transition-all duration-200"
                  onClick={() => {
                    document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
                    track('skip_to_form_hero', {});
                  }}
                >
                  Submit Now ⚡
                </Button>
                <Button
                  href="#inspiration"
                  variant="outline"
                  size="lg"
                  className="border-2 border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200"
                  onClick={() => {
                    document.getElementById('inspiration')?.scrollIntoView({ behavior: 'smooth' });
                    track('get_ideas_hero', {});
                  }}
                >
                  Get Talk Ideas 💡
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-8 rounded-lg shadow-lg"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start">
                  <Mic className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Share Your Expertise</h3>
                    <p className="text-gray-600 text-sm">Help others learn from your experiences and insights</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Build Your Network</h3>
                    <p className="text-gray-600 text-sm">Connect with like-minded developers in the community</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrendingUp className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Grow Your Career</h3>
                    <p className="text-gray-600 text-sm">Speaking builds visibility and opens doors to new opportunities</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Community Stats & Waiting Info */}
      {submissionStats && (
        <Section variant="white" padding="md">
          <div className="bg-gradient-to-r from-js/10 to-yellow-100 rounded-2xl p-8 mb-12 border border-yellow-200">
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-bold mb-4 text-black"
              >
                🎤 Join Our Amazing Speaker Community!
              </motion.h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                We&apos;re building something special with passionate developers from all over Zurich and beyond.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur rounded-xl p-6 text-center border border-yellow-300 shadow-sm"
              >
                <TrendingUp className="mx-auto mb-3 text-green-600" size={32} />
                <div className="text-2xl font-bold text-black mb-1">{submissionStats.recentSubmissions}</div>
                <div className="text-sm text-gray-600">{submissionStats.recentSubmissions === 0 ? 'No recent submissions - great timing!' : 'Submissions in last 90 days'}</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur rounded-xl p-6 text-center border border-yellow-300 shadow-sm"
              >
                <Clock className="mx-auto mb-3 text-blue-600" size={32} />
                <div className="text-lg font-bold text-black mb-1">1-2 weeks to 3-4 months</div>
                <div className="text-sm text-gray-600">Depends on theme match & capacity</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur rounded-xl p-6 text-center border border-yellow-300 shadow-sm"
              >
                <Users className="mx-auto mb-3 text-purple-600" size={32} />
                <div className="text-2xl font-bold text-black mb-1">{submissionStats.pendingSubmissions}</div>
                <div className="text-sm text-gray-600">Talks waiting for review</div>
              </motion.div>
            </div>

            <div className="bg-white/60 backdrop-blur rounded-xl p-6 border border-yellow-300">
              <div className="flex items-start space-x-3 mb-4">
                <MessageCircle className="text-yellow-600 mt-1 flex-shrink-0" size={20} />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-2">📋 How our selection process works:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>We read every submission</strong> and appreciate the time you put into applying</li>
                    <li>• <strong>Order of submission ≠ order of acceptance</strong> - we curate based on event themes and diversity</li>
                    <li>• <strong>Want to speak at a specific event?</strong> Reach out after submitting and we&apos;ll try our best!</li>
                    <li>• <strong>High-quality backlog:</strong> Our speakers are awesome, so the wait might be worth it 🚀</li>
                  </ul>
                </div>
              </div>
              <div className="text-center">
                <Button
                  href="#form"
                  variant="primary"
                  size="md"
                  className="bg-black hover:bg-gray-800 text-white font-semibold"
                  onClick={() => {
                    document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
                    track('submit_now_stats', {});
                  }}
                >
                  Submit Now 🚀
                </Button>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Talk Inspiration Section */}
      <Section variant="gray" padding="lg" id="inspiration">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-6 text-black">💡 Need Talk Ideas? We&apos;ve Got You!</h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
            Can&apos;t decide what to talk about? Don&apos;t worry! We don&apos;t just want JavaScript talks. 
            We love <strong>web technologies</strong>, <strong>soft skills</strong>, <strong>career stories</strong>, 
            <strong>developer tools</strong>, and anything that gets developers excited! 
          </p>
        </motion.div>

        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-start space-x-4">
            <Calendar className="text-yellow-600 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-bold mb-3 text-black">What Makes a Great Talk?</h3>
              <div className="flex flex-col gap-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold">✨</span>
                  <span><strong>Personal experiences</strong> - your journey & wins</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold">🔧</span>
                  <span><strong>Practical insights</strong> - tools & techniques</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold">🌟</span>
                  <span><strong>What excites you</strong> - new tech & ideas</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold">💡</span>
                  <span><strong>Lessons learned</strong> - from projects & mistakes</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 italic">
                💭 The best talks come from genuine passion. What gets you excited about development?
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Submission Guidelines */}
      <Section variant="white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3">Submission guidelines</h2>
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
              We offer slots for lightning talks (5 min), standard talks (25 min)
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
      </Section>

      {/* Submission Form */}
      <Section variant="gray" id="form">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold">Submit Your Talk</h2>
            
            {/* Autosave indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isAutoSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-js"></div>
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save size={16} className="text-green-600" />
                  <span>Saved {lastSaved.toLocaleDateString()} at {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : hasLoadedFromStorage ? (
                <>
                  <Save size={16} className="text-gray-400" />
                  <span>Start typing - your draft will auto-save so you can come back later</span>
                </>
              ) : null}
            </div>
          </div>
          
          {/* Auto-save info banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-800">
              <Save size={16} className="mr-2 text-blue-600" />
              <span>
                <strong>Don&apos;t worry about finishing in one go!</strong> Your progress is automatically saved to your browser as you type. 
                You can close this page and return later to continue where you left off.
              </span>
            </div>
          </div>
          
          {/* Email alternative info */}
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm text-green-800">
              <MessageCircle size={16} className="mr-2 text-green-600" />
              <span>
                <strong>Having trouble?</strong> You can always email your talk proposal directly to{' '}
                <a href="mailto:hello@zurichjs.com" className="underline font-semibold">hello@zurichjs.com</a>{' '}
                if you encounter any issues with this form.
              </span>
            </div>
          </div>

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
                <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3 mb-4">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-red-800 font-semibold">Submission Error</h3>
                      <p className="text-red-700 mt-1">{formState.error}</p>
                    </div>
                  </div>
                  
                  <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-semibold mb-2">📧 Alternative: Email Your Submission</h4>
                    <p className="text-red-700 text-sm mb-3">
                      Don&apos;t worry! You can send your talk proposal directly to us via email. 
                      Click below to generate an email with your current form data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={`mailto:hello@zurichjs.com?body=${generateEmailBody()}`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                        onClick={() => track('email_fallback_used', { error: formState.error })}
                      >
                        📧 Send Email with Current Data
                      </a>
                      <a
                        href="mailto:hello@zurichjs.com?subject=CFP%20Submission%20-%20Talk%20Proposal"
                        className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium rounded-md transition-colors"
                      >
                        Send Blank Email
                      </a>
                    </div>
                    <p className="text-xs text-red-600 mt-2">
                      💡 The first option will pre-fill an email with your current form data so you don&apos;t lose your work.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-js rounded-full text-black font-bold mr-3">
                    1
                  </div>
                  <h3 className="text-xl font-bold">Speaker Information</h3>
                </div>
                <p className="text-gray-600 mb-6 ml-11">Tell us about yourself so we can introduce you properly.</p>
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
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        validationErrors.firstName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-js'
                      }`}
                      required
                    />
                    {validationErrors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                    )}
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
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        validationErrors.lastName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-js'
                      }`}
                      required
                    />
                    {validationErrors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                    )}
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
                    placeholder="e.g. Senior Frontend Developer, Tech Lead, Product Manager"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      validationErrors.jobTitle 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js hover:border-gray-400'
                    }`}
                    required
                  />
                  {validationErrors.jobTitle && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.jobTitle}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="biography" className="block text-gray-700 mb-2">
                    Biography *
                  </label>
                  <textarea
                    id="biography"
                    name="biography"
                    value={formState.biography}
                    onChange={handleInputChange}
                    rows={5}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.biography 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js'
                    }`}
                    placeholder='Share your background, experience with JavaScript, connection to Zürich, or what motivates you to speak...'
                    required
                  />
                  {validationErrors.biography && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.biography}</p>
                  )}
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
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.email 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js'
                    }`}
                    required
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                  )}
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
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.linkedinProfile 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js'
                    }`}
                    required
                  />
                  {validationErrors.linkedinProfile && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.linkedinProfile}</p>
                  )}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                      className={`flex items-center gap-2 w-full px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        validationErrors.speakerImage 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                      }`}
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
                {validationErrors.speakerImage && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.speakerImage}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Recommended: Square image, at least 400x400px</p>
              </div>

              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-js rounded-full text-black font-bold mr-3">
                    2
                  </div>
                  <h3 className="text-xl font-bold">Talk Details</h3>
                </div>
                <p className="text-gray-600 mb-6 ml-11">Share the details of your talk proposal with us.</p>
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
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.title 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js'
                    }`}
                    required
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                  )}
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
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.description 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-js'
                    }`}
                    required
                    placeholder="Describe your talk, key takeaways, and what the audience will learn. Include any demos or examples you'll show..."
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                  )}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-js rounded-full text-black font-bold mr-3">
                    3
                  </div>
                  <label className="text-xl font-bold">
                    Talk Topics *
                  </label>
                </div>
                <p className="text-gray-600 mb-4 ml-11">Select the topics that best describe your talk. Choose multiple if relevant.</p>
                <div className="flex flex-wrap gap-3">
                  {talkTopics.map((topic) => (
                    <div
                      key={topic}
                      onClick={() => handleTopicChange(topic)}
                      className={`cursor-pointer flex items-center px-4 py-2 rounded-full transition-all transform hover:scale-105 ${formState.topics.includes(topic)
                          ? 'bg-js text-black shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                        }`}
                    >
                      <Tag size={14} className="mr-1" />
                      {topic}
                    </div>
                  ))}
                </div>
                {validationErrors.topics && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.topics}</p>
                )}
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
      </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  try {
    const submissionStats = await getTalkSubmissionStats();

    console.log('submissionStats', submissionStats);

    return {
      props: {
        submissionStats,
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    
    // Return empty props - let UI handle missing data gracefully
    return {
      props: {
        submissionStats: null,
      },
      revalidate: 300, // Try again sooner if there was an error
    };
  }
}
