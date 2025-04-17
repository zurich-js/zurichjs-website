import { useUser } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { useCheckUserSurvey } from '@/hooks/useCheckUserSurvey';

// Define the expected shape of survey data (same as in useCheckUserSurvey.ts)
interface SurveyData {
    role: string;
    company: string;
    interests: string[];
    experience: string;
    newsletter: boolean;
}

// List of common developer roles
const roles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'UI/UX Designer',
    'Engineering Manager',
    'Student',
    'Other'
];

// List of common JavaScript interests
const interestOptions = [
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'Deno',
    'TypeScript',
    'Next.js',
    'Remix',
    'GraphQL',
    'Testing',
    'Performance',
    'Accessibility',
    'WebAssembly',
    'Web3',
    'Svelte',
    'Astro',
    'Qwik',
    'Tailwind CSS',
    'SolidJS',
    'Bun',
    'Serverless',
    'DevOps',
    'AI Integration',
    'Progressive Web Apps',
    'Other'
];

// Experience levels
const experienceLevels = [
    'Beginner (0-1 years)',
    'Junior (1-2 years)',
    'Mid-Level (2-4 years)',
    'Senior (4-6 years)',
    'Expert (6-8 years)',
    'Veteran (8-10 years)',
    'Legend (10+ years)'
];

export default function Survey() {
    const router = useRouter();
    const { user } = useUser();
    const { surveyData: existingData } = useCheckUserSurvey();

    // Initialize form state from empty values
    const [formData, setFormData] = useState<SurveyData>({
        role: '',
        company: '',
        interests: [],
        experience: '',
        newsletter: true // Default to true
    });

    // Update form data when existingData becomes available
    useEffect(() => {
        if (existingData) {
            setFormData({
                role: existingData.role || '',
                company: existingData.company || '',
                interests: existingData.interests || [],
                experience: existingData.experience || '',
                newsletter: existingData.newsletter !== false // Default to true unless explicitly set to false
            });
        }
    }, [existingData]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Handle text input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle checkbox changes for interests
    const handleInterestChange = (interest: string) => {
        setFormData(prev => {
            const interests = prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest];
            return { ...prev, interests };
        });
    };

    // Handle newsletter checkbox (reversed logic for opt-out)
    const handleNewsletterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, newsletter: !e.target.checked }));
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Ensure all required fields are filled
            if (!formData.role || !formData.company || formData.interests.length === 0 || !formData.experience) {
                throw new Error('Please fill in all required fields');
            }

            // Update user metadata via Clerk
            await user?.update({
                unsafeMetadata: {
                    surveyData: formData
                }
            });

            // Redirect to profile or dashboard
            router.push('/profile');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>


            <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Your ZurichJS Profile</h1>
                        <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
                        <p className="text-black text-lg md:text-xl max-w-2xl mx-auto">
                            Help us create a community that works for <span className="font-bold">you</span>
                        </p>
                    </div>

                    <div className="bg-white bg-opacity-95 rounded-xl shadow-2xl p-6 sm:p-8 md:p-10">
                        <div className="mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Tell us about yourself</h2>
                            <p className="text-gray-600">
                                We&apos;d love to get to know you better so we can tailor ZurichJS events,
                                content, and opportunities to match your interests.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Personal Information Section */}
                            <div className="p-5 bg-gray-50 rounded-lg space-y-6">
                                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Professional Background</h3>

                                {/* Role Selection */}
                                <div className="mb-6">
                                    <label htmlFor="role" className="block text-gray-700 font-medium mb-2 text-sm uppercase tracking-wide">
                                        Your Role <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select your role</option>
                                        {roles.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Company */}
                                <div className="mb-6">
                                    <label htmlFor="company" className="block text-gray-700 font-medium mb-2 text-sm uppercase tracking-wide">
                                        Company / Organization <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="company"
                                        name="company"
                                        placeholder="Where do you work or study?"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                {/* Experience Level */}
                                <div>
                                    <label htmlFor="experience" className="block text-gray-700 font-medium mb-2 text-sm uppercase tracking-wide">
                                        JavaScript Experience <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="experience"
                                        name="experience"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white"
                                        value={formData.experience}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select your experience level</option>
                                        {experienceLevels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Interests Section */}
                            <div className="p-5 bg-gray-50 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Your JavaScript Interests</h3>
                                <p className="text-gray-600 mb-4">Select all topics you&apos;re interested in learning more about or discussing at our events.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {interestOptions.map(interest => (
                                        <div key={interest} className="flex items-start bg-white p-3 rounded border border-gray-200 hover:border-yellow-400 transition-all">
                                            <input
                                                type="checkbox"
                                                id={`interest-${interest}`}
                                                checked={formData.interests.includes(interest)}
                                                onChange={() => handleInterestChange(interest)}
                                                className="h-5 w-5 mt-0.5 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`interest-${interest}`} className="ml-3 text-gray-700 font-medium">
                                                {interest}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {formData.interests.length === 0 && (
                                    <p className="text-sm text-red-500 mt-3">Please select at least one interest</p>
                                )}
                            </div>

                            {/* Newsletter Subscription */}
                            <div className="p-5 bg-gray-50 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Stay Connected</h3>
                                <div className="flex items-start">
                                    <input
                                        type="checkbox"
                                        id="newsletter"
                                        name="newsletter"
                                        checked={!formData.newsletter}
                                        onChange={handleNewsletterChange}
                                        className="h-5 w-5 mt-1 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                                    />
                                    <label htmlFor="newsletter" className="ml-3 text-gray-700">
                                        <span className="font-medium block mb-1">Opt out of newsletter</span>
                                        <span className="text-sm text-gray-500">Check this box if you don&apos;t want to receive our newsletter with upcoming events and community highlights</span>
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-4">
                                <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                                    * Required fields
                                </p>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 !text-black font-bold shadow-lg"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save My Preferences'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
