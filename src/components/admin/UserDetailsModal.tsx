import { X, User, Calendar, Mail, Phone, Briefcase, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SurveyData {
  role: string;
  company: string;
  interests: string[];
  experience: string;
  newsletter: boolean;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddress: {
    emailAddress: string;
  } | null;
  phoneNumbers?: {
    phoneNumber: string;
  }[];
  lastSignInAt: number | null;
  createdAt: number;
  lastActiveAt: number | null;
  unsafeMetadata?: {
    surveyData?: SurveyData;
  };
}

interface UserDetailsModalProps {
  user: ClerkUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'survey'>('overview');
  
  // Close the modal when Escape key is pressed
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);
  
  // Format dates
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // If no user or modal is closed, don't render anything
  if (!isOpen || !user) return null;
  
  // Helper to check if survey data exists
  const hasSurveyData = !!user.unsafeMetadata?.surveyData;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* User Info */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <div className="h-20 w-20 flex-shrink-0">
            {user.imageUrl ? (
              <img className="h-20 w-20 rounded-full" src={user.imageUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={40} className="text-gray-500" />
              </div>
            )}
          </div>
          <div className="ml-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.username || 'Unnamed User'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">User ID: {user.id}</p>
            {user.primaryEmailAddress && (
              <p className="text-gray-700 flex items-center mt-2">
                <Mail size={16} className="mr-2" />
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 border-b-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('survey')}
              className={`py-4 px-6 border-b-2 text-sm font-medium ${
                activeTab === 'survey'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Survey Data {!hasSurveyData && '(None)'}
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 214px)' }}>
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Account Info</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm font-mono">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Account Created</p>
                    <p className="text-sm flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Activity</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Last Sign In</p>
                    <p className="text-sm flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(user.lastSignInAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Active</p>
                    <p className="text-sm flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(user.lastActiveAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Contact Info</h4>
                <div className="space-y-3">
                  {user.primaryEmailAddress && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm flex items-center">
                        <Mail size={14} className="mr-1" />
                        {user.primaryEmailAddress.emailAddress}
                      </p>
                    </div>
                  )}
                  
                  {user.phoneNumbers && user.phoneNumbers.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm flex items-center">
                        <Phone size={14} className="mr-1" />
                        {user.phoneNumbers[0].phoneNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {hasSurveyData ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Professional Info</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Role</p>
                          <p className="text-sm flex items-center">
                            <Briefcase size={14} className="mr-1" />
                            {user.unsafeMetadata!.surveyData!.role}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Company</p>
                          <p className="text-sm">
                            {user.unsafeMetadata!.surveyData!.company}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Experience Level</p>
                          <p className="text-sm">
                            {user.unsafeMetadata!.surveyData!.experience}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Interests</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.unsafeMetadata!.surveyData!.interests.map((interest, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                          >
                            <Tag size={12} className="mr-1" /> {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Preferences</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Newsletter Subscription</p>
                        <p className="text-sm">
                          {user.unsafeMetadata!.surveyData!.newsletter ? 'Subscribed' : 'Not subscribed'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No survey data available for this user.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 