import { X, User, Calendar, Mail, Phone, Briefcase, Tag, Check, XCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SurveyData {
  role: string;
  company: string;
  interests: string[];
  experience: string;
  newsletter: boolean;
}

interface Coupon {
  code: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  emailAddresses?: { emailAddress: string }[];
  phoneNumbers?: {
    phoneNumber: string;
  }[];
  lastSignInAt: number | null;
  createdAt: number;
  lastActiveAt: number | null;
  unsafeMetadata?: {
    surveyData?: SurveyData;
    coupons?: Coupon[];
  };
}

interface UserDetailsModalProps {
  user: ClerkUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'survey' | 'coupons'>('overview');
  const [isAssigningCoupon, setIsAssigningCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticCoupons, setOptimisticCoupons] = useState<Coupon[]>([]);
  const [shouldShowModal, setShouldShowModal] = useState(isOpen);
  
  // Initialize optimisticCoupons with user's existing coupons
  useEffect(() => {
    if (user?.unsafeMetadata?.coupons) {
      setOptimisticCoupons(user.unsafeMetadata.coupons);
    } else {
      setOptimisticCoupons([]);
    }
  }, [user]);
  
  // Sync shouldShowModal with isOpen prop
  useEffect(() => {
    setShouldShowModal(isOpen);
  }, [isOpen]);

  // Close the modal when Escape key is pressed
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShouldShowModal(false);
        onClose();
      }
    };
    
    if (shouldShowModal) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [shouldShowModal, onClose]);
  
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
  if (!shouldShowModal || !user) return null;
  
  // Helper to check if survey data exists
  const hasSurveyData = !!user.unsafeMetadata?.surveyData;
  
  const handleAssignCoupon = async () => {
    if (!user || !couponCode.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    // Optimistically update the UI
    const newCoupon: Coupon = {
      code: couponCode.trim(),
      assignedAt: new Date().toISOString(),
      assignedBy: user.id, // This will be updated by the server
      isActive: true,
    };
    
    setOptimisticCoupons(prev => [...prev, newCoupon]);
    
    try {
      const response = await fetch('/api/admin/assign-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          couponCode: couponCode.trim(),
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        setOptimisticCoupons(prev => prev.filter(c => c.code !== couponCode.trim()));
        throw new Error('Failed to assign coupon');
      }
      
      // Close the coupon assignment form
      setIsAssigningCoupon(false);
      setCouponCode('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCoupon = async (couponCode: string, isActive: boolean) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    // Optimistically update the UI
    setOptimisticCoupons(prev => 
      prev.map(coupon => 
        coupon.code === couponCode 
          ? { ...coupon, isActive }
          : coupon
      )
    );
    
    try {
      const response = await fetch('/api/admin/toggle-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          couponCode,
          isActive,
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        setOptimisticCoupons(prev => 
          prev.map(coupon => 
            coupon.code === couponCode 
              ? { ...coupon, isActive: !isActive }
              : coupon
          )
        );
        throw new Error('Failed to toggle coupon status');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCoupon = async (couponCode: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    // Optimistically update the UI
    setOptimisticCoupons(prev => prev.filter(coupon => coupon.code !== couponCode));
    
    try {
      const response = await fetch('/api/admin/remove-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          couponCode,
        }),
      });
      
      if (!response.ok) {
        // Revert optimistic update on error
        if (user.unsafeMetadata?.coupons) {
          setOptimisticCoupons(user.unsafeMetadata.coupons);
        }
        throw new Error('Failed to remove coupon');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black opacity-50" 
        onClick={() => {
          setShouldShowModal(false);
          onClose();
        }}
      ></div>
      
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 mx-4 sm:mx-0">
        {/* Header */}
        <div className="bg-gray-100 px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* User Info */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center">
          <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
            {user.imageUrl ? (
              <img className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" src={user.imageUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={32} className="text-gray-500" />
              </div>
            )}
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-6">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.username || 'Unnamed User'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">User ID: {user.id}</p>
            {user.emailAddresses?.[0]?.emailAddress && (
              <p className="text-gray-700 flex items-center mt-2">
                <Mail size={16} className="mr-2" />
                {user.emailAddresses[0].emailAddress}
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
            <button
              onClick={() => setActiveTab('coupons')}
              className={`py-4 px-6 border-b-2 text-sm font-medium ${
                activeTab === 'coupons'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Coupons
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="overflow-y-auto p-4 sm:p-6" style={{ maxHeight: 'calc(90vh - 214px)' }}>
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Account Info</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm font-mono break-all">{user.id}</p>
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
                  {user.emailAddresses?.[0]?.emailAddress && (
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm flex items-center break-all">
                        <Mail size={14} className="mr-1 flex-shrink-0" />
                        {user.emailAddresses[0].emailAddress}
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
          ) : activeTab === 'survey' ? (
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
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Coupon Management</h3>
                {!isAssigningCoupon && (
                  <button
                    onClick={() => setIsAssigningCoupon(true)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 focus:outline-none flex items-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Coupon
                  </button>
                )}
              </div>

              {isAssigningCoupon && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={handleAssignCoupon}
                        disabled={isLoading || !couponCode.trim()}
                        className="flex-1 sm:flex-none px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Assigning...' : 'Assign'}
                      </button>
                      <button
                        onClick={() => {
                          setIsAssigningCoupon(false);
                          setCouponCode('');
                          setError(null);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {optimisticCoupons.length ? (
                  optimisticCoupons.map((coupon) => (
                    <div key={coupon.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Tag className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{coupon.code}</p>
                          <p className="text-sm text-gray-500">
                            Assigned on {new Date(coupon.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleCoupon(coupon.code, !coupon.isActive)}
                          disabled={isLoading}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {coupon.isActive ? (
                            <>
                              <Check className="h-4 w-4 inline-block mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 inline-block mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveCoupon(coupon.code)}
                          disabled={isLoading}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                          title="Remove coupon"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No coupons assigned to this user.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-100 px-4 sm:px-6 py-3 flex justify-end">
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