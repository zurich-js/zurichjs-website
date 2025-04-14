import { motion } from 'framer-motion';
import { Users, MessageCircle, Share2, Calendar, Code, BookOpen, HeartHandshake, Clock } from 'lucide-react';
import { useState, ChangeEvent, FormEvent } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  linkedinProfile: string;
  githubProfile: string;
  message: string;
  interests: string[];
  availability: string;
  submitted: boolean;
  isSubmitting: boolean;
  error: string;
}

export default function CFV() {
  useReferrerTracking();
  const { track } = useEvents();

  const [formState, setFormState] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    linkedinProfile: '',
    githubProfile: '',
    message: '',
    interests: [],
    availability: 'monthly',
    submitted: false,
    isSubmitting: false,
    error: '',
  });

  const volunteerRoles = [
    'Community Management',
    'Social Media Marketing',
    'Partnership & Speaker Outreach',
    'Event Organization',
    'Platform Development',
    'Workshop Organization',
    'Content Creation',
    'Graphic Design',
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleInterestChange = (interest: string) => {
    const newInterests = formState.interests.includes(interest)
      ? formState.interests.filter((i) => i !== interest)
      : [...formState.interests, interest];

    // Track interest selection/deselection
    track('interest_selection', {
      action: formState.interests.includes(interest) ? 'deselect' : 'select',
      interest: interest
    });

    setFormState((prev) => ({ ...prev, interests: newInterests }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Form validation
    if (!formState.firstName || !formState.lastName || !formState.email ||
        !formState.linkedinProfile || !formState.message) {

      // Track validation error
      track('form_error', {
        errorType: 'missing_required_fields'
      });

      setFormState((prev) => ({ ...prev, error: 'Please fill out all required fields' }));
      return;
    }

    if (formState.interests.length === 0) {
      // Track validation error
      track('form_error', {
        errorType: 'no_interests_selected'
      });

      setFormState((prev) => ({ ...prev, error: 'Please select at least one area of interest' }));
      return;
    }

    // Set loading state
    setFormState((prev) => ({ ...prev, isSubmitting: true, error: '' }));

    try {
      // Create form data
      const formData = new FormData();

      // Combine first and last name
      const fullName = `${formState.firstName} ${formState.lastName}`;

      // Add all form fields to formData
      formData.append('name', fullName);
      formData.append('firstName', formState.firstName);
      formData.append('lastName', formState.lastName);
      formData.append('email', formState.email);
      formData.append('linkedinProfile', formState.linkedinProfile);
      formData.append('githubProfile', formState.githubProfile || '');
      formData.append('message', formState.message);
      formData.append('availability', formState.availability);
      formData.append('interests', JSON.stringify(formState.interests));

      // Track form submission attempt
      track('volunteer_form_submit', {
        interests: JSON.stringify(formState.interests),
        availability: formState.availability
      });

      // Submit to our API endpoint
      const response = await fetch('/api/submit-volunteer', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while submitting your application');
      }

      // Track successful submission
      track('volunteer_form_submit_success');

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
      track('volunteer_form_submit_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An error occurred while submitting your application'
      }));
    }
  };

  return (
    <Layout>
      <SEO
        title="Volunteer With Us | ZurichJS"
        description="Join the ZurichJS team as a volunteer. Help us build a thriving JavaScript community in Zurich!"
        openGraph={{
          title: "Volunteer With Us | ZurichJS",
          description: "Help us build a thriving JavaScript community in Zurich by joining our volunteer team.",
          image: "/api/og/cfv",
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
                Call for Volunteers
              </h1>
              <p className="text-lg md:text-xl mb-4 md:mb-6">
                Help us build a thriving JavaScript community in Zurich!
              </p>
              <p className="text-base md:text-lg mb-6 md:mb-8">
                ZurichJS is 100% community-driven, and we need passionate people like you
                to help us grow and make an impact. While we cannot offer compensation,
                you&apos;ll gain valuable experience, connections, and the satisfaction of
                building something meaningful.
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
                  <HeartHandshake className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Make an Impact</h3>
                    <p className="text-gray-600">Help shape the future of tech in Zurich</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Grow Your Network</h3>
                    <p className="text-gray-600">Connect with leading developers and companies</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Volunteer Roles */}
      <Section variant="white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3">How You Can Help</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We&apos;re looking for volunteers to support various aspects of our community.
            Here are some of the key areas where we need help.
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
            <MessageCircle className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Community Management</h3>
            <p className="text-gray-600">
              Help moderate our online community platforms, engage with members, and ensure
              we maintain a welcoming environment for everyone.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <Share2 className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Social Media Marketing</h3>
            <p className="text-gray-600">
              Craft engaging content for our social media channels, help promote our events,
              and grow our online presence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <HeartHandshake className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Partnership & Speaker Outreach</h3>
            <p className="text-gray-600">
              Connect with potential partners, sponsors, and speakers to help us create
              valuable and diverse content for our community.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <Calendar className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Event Organization</h3>
            <p className="text-gray-600">
              Assist with planning, organizing, and running our meetups and other events,
              from logistics to attendee experience.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <Code className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Platform Development</h3>
            <p className="text-gray-600">
              Contribute to our website and other technical platforms, helping us improve
              user experience and add new features.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gray-50 p-6 rounded-lg border border-gray-200"
          >
            <BookOpen className="text-yellow-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Workshop Organization</h3>
            <p className="text-gray-600">
              Help plan and run educational workshops, creating opportunities for hands-on
              learning within our community.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* Benefits Section */}
      <Section variant="gray">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3">Why Volunteer With Us?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            While we cannot offer financial compensation, volunteering with ZurichJS offers many valuable benefits.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm"
          >
            <h3 className="text-xl font-bold mb-3 text-center">Professional Growth</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Develop new skills in tech, marketing, or event management</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Build your portfolio with real-world projects</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Gain leadership experience in community initiatives</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm"
          >
            <h3 className="text-xl font-bold mb-3 text-center">Networking</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Connect with tech leaders and innovators</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Build relationships with local tech companies</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Become part of a supportive community of peers</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm"
          >
            <h3 className="text-xl font-bold mb-3 text-center">Personal Impact</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Help shape the local tech ecosystem</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Contribute to educational initiatives</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Create opportunities for others in tech</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* Volunteer Form */}
      <Section variant="white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold mb-6">Join Our Team</h2>

          {formState.submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
            >
              <Users size={64} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-bold mb-2">Thank You for Volunteering!</h3>
              <p className="mb-6">
                We&apos;ve received your application and we&apos;re excited about the possibility of having you join our team.
                Someone from our organizing committee will contact you within the next 7 days to discuss the next steps.
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
                <h3 className="text-xl font-bold mb-4">Your Information</h3>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                      required
                    />
                  </div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                    required
                  />
                </div>

                <div className="mb-4">
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
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4">Volunteer Details</h3>
                
                <div className="mb-4">
                  <label htmlFor="availability" className="block text-gray-700 mb-2">
                    Availability *
                  </label>
                  <select
                    id="availability"
                    name="availability"
                    value={formState.availability}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                    required
                  >
                    <option value="weekly">A few hours weekly</option>
                    <option value="monthly">A few hours monthly</option>
                    <option value="events">Only during events</option>
                    <option value="other">Other (please specify in message)</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">
                    Areas of Interest * (select at least one)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {volunteerRoles.map((interest) => (
                      <div
                        key={interest}
                        onClick={() => handleInterestChange(interest)}
                        className={`cursor-pointer flex items-center px-3 py-1.5 rounded-full ${formState.interests.includes(interest)
                            ? 'bg-js text-black'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="message" className="block text-gray-700 mb-2">
                    Why do you want to volunteer with ZurichJS? *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formState.message}
                    onChange={handleInputChange}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                    required
                    placeholder="Tell us about your skills, experience, and why you'd like to join our team..."
                  />
                </div>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-md text-sm text-gray-600">
                <div className="flex items-start">
                  <Clock className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" size={18} />
                  <p>
                    ZurichJS is 100% community-driven and run by volunteers. While we cannot offer financial compensation, 
                    we strive to create an enriching experience that helps you grow professionally and personally while making 
                    a positive impact on the local tech ecosystem.
                  </p>
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
                    'Submit Application'
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
