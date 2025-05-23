import { useUser } from "@clerk/nextjs";
import { User, CreditCard, Zap, Mail, Calendar } from "lucide-react";
import { useRouter } from 'next/router';

import Layout from '@/components/layout/Layout';
import CouponsSection from '@/components/profile/CouponsSection';
import Button from '@/components/ui/Button';
import { useCheckUserSurvey } from '@/hooks/useCheckUserSurvey';

export default function Profile() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isValid, surveyData } = useCheckUserSurvey();

  if (!isLoaded) {
    return (
      <Layout>
        <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Loading Profile...</h1>
              <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <Layout>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Your ZurichJS Profile</h1>
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <p className="text-black text-lg md:text-xl max-w-2xl mx-auto">
              Welcome back, <span className="font-bold">{user.firstName || user.username}</span>!
            </p>
          </div>
          
          {/* Member Benefits Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 bg-indigo-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 -mb-6 -ml-6 bg-blue-200 rounded-full opacity-70"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your ZurichJS Member Benefits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-100 p-2 rounded-full mt-1">
                    <CreditCard size={20} className="text-indigo-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Faster Checkout</p>
                    <p className="text-gray-700">Pre-filled email and details for quicker registration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Zap size={20} className="text-green-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">20% Off All Paid Events</p>
                    <p className="text-gray-700">Automatic discounts on workshops and pro events</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-full mt-1">
                    <Calendar size={20} className="text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Priority Access</p>
                    <p className="text-gray-700">Early access to limited-seat workshops</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full mt-1">
                    <Mail size={20} className="text-yellow-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Personalized Updates</p>
                    <p className="text-gray-700">Get notified about events matching your interests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-md p-6 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Pro Events</h3>
                <p className="text-gray-700 mb-6">
                  Gain insights from industry experts with specialized deep-dive sessions and networking.
                </p>
              </div>
              <div className="mt-auto">
                <Button 
                  href="/events"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 w-full"
                >
                  Explore Pro Events
                </Button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl shadow-md p-6 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Workshops</h3>
                <p className="text-gray-700 mb-6">
                  Hands-on learning experiences to level up your JavaScript skills with industry leaders.
                </p>
              </div>
              <div className="mt-auto">
                <Button 
                  href="/workshops"
                  variant="primary"
                  className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 w-full"
                >
                  Browse Workshops
                </Button>
              </div>
            </div>
          </div>

          <CouponsSection />

          {/* Slack CTA Banner */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl shadow-lg p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 bg-purple-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 -mb-6 -ml-6 bg-blue-200 rounded-full opacity-70"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              <div className="text-left mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect With Our Community!</h2>
                <p className="text-gray-700">Join our Slack workspace to engage directly with speakers, participate in polls, ask questions, and help shape the future of ZurichJS. It&apos;s where our community comes alive!</p>
              </div>
              <Button 
                href="https://join.slack.com/t/zurichjs/shared_invite/zt-35xc7fswg-NswAFDUErn1XoUF8ixH6fg"
                variant="primary"
                className="bg-[#4A154B] hover:bg-[#611f64] focus:ring-purple-500 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base shadow-md transform transition-transform duration-200 hover:scale-105 whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-1 sm:mr-2" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" fillRule="evenodd">
                    <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                    <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                    <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                    <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                  </g>
                </svg>
                <span className="font-medium">Join Slack</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information Card */}
            <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User size={24} className="text-blue-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Personal Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Full Name</p>
                  <p className="text-lg text-gray-900">{user.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500">Email</p>
                  <p className="text-lg text-gray-900">{user.primaryEmailAddress?.emailAddress || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Survey Information Card */}
            <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <span className="text-xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Community Profile</h2>
              </div>
              
              {isValid ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Professional Role</p>
                    <p className="text-lg text-gray-900">{surveyData?.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Company/Organization</p>
                    <p className="text-lg text-gray-900">{surveyData?.company}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">JS Experience</p>
                    <p className="text-lg text-gray-900">{surveyData?.experience}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Interests</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {surveyData?.interests?.map((interest: string) => (
                        <span 
                          key={interest} 
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Newsletter</p>
                    <p className="text-lg text-gray-900">{surveyData?.newsletter ? 'Subscribed' : 'Not subscribed'}</p>
                  </div>
                  <div className="mt-6">
                    <Button 
                      href="/profile/survey" 
                      variant="outline"
                      className="w-full"
                    >
                      Update Community Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-700">
                    Complete your profile to unlock all ZurichJS benefits including personalized event 
                    recommendations and automatic 20% discount on all paid events!
                  </p>
                  <Button 
                    href="/profile/survey" 
                    variant="primary"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400"
                  >
                    Complete Your Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
