import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import { useRouter } from 'next/router';

import Layout from '@/components/layout/Layout';
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
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Your Profile</h1>
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <p className="text-black text-lg md:text-xl max-w-2xl mx-auto">
              Welcome back, <span className="font-bold">{user.firstName || user.username}</span>!
            </p>
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
                    Help us create a community that works for <span className="font-bold">you</span>. 
                    Please complete your community profile to help us tailor ZurichJS events and content 
                    to match your interests.
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
