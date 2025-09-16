import { OrganizationSwitcher } from '@clerk/nextjs';
import { User, Search, Calendar, UserCog, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

import UserDetailsModal from '@/components/admin/UserDetailsModal';
import UserStats from '@/components/admin/UserStats';
import Layout from '@/components/layout/Layout';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddress: string | null;
  lastSignInAt: number | null;
  createdAt: number;
  lastActiveAt: number | null;
  unsafeMetadata?: {
    credits?: number;
    referrals?: Array<{
      userId: string;
      email: string;
      date: string;
      type: string;
      creditValue: number;
    }>;
    referredBy?: {
      userId: string;
      name: string;
      date: string;
    };
    surveyData?: {
      role: string;
      company: string;
      interests: string[];
      experience: string;
      newsletter: boolean;
    };
  };
  emailAddresses?: { emailAddress: string }[];
}

interface Pagination {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

interface UsersProps {
  users: ClerkUser[];
  pagination: Pagination;
  searchQuery: string;
}

export default function AdminUsersPage({ users, pagination, searchQuery }: UsersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery);
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push({
      pathname: '/admin/users',
      query: { 
        ...(search ? { query: search } : {}),
        page: 1 
      }
    });
  };
  
  const handlePageChange = (page: number) => {
    router.push({
      pathname: '/admin/users',
      query: { 
        ...(searchQuery ? { query: searchQuery } : {}),
        page 
      }
    });
  };
  
  const handleViewDetails = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Find the user in the current list
      const userInList = users.find(user => user.id === userId);
      
      if (userInList) {
        setSelectedUser(userInList);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
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

  const exportToCSV = async () => {
    try {
      setIsLoading(true);

      // Fetch all users for export
      const response = await fetch(`/api/admin/users?export=true${searchQuery ? `&query=${searchQuery}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users for export');
      }

      const data = await response.json();
      const allUsers = data.users || [];

      const csvHeaders = [
        'ID',
        'First Name',
        'Last Name',
        'Username',
        'Email',
        'Last Sign In',
        'Created At',
        'Credits',
        'Role',
        'Company',
        'Experience',
        'Newsletter',
        'Interests',
        'Referrals Count',
        'Referred By'
      ];

      const csvData = allUsers.map((user: ClerkUser) => {
        const metadata = user.unsafeMetadata || {};
        const surveyData = metadata.surveyData || {} as NonNullable<ClerkUser['unsafeMetadata']>['surveyData'];
        const referrals = metadata.referrals || [];
        const referredBy = metadata.referredBy;

        return [
          user.id,
          user.firstName || '',
          user.lastName || '',
          user.username || '',
          user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress || '',
          user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : '',
          new Date(user.createdAt).toISOString(),
          metadata.credits || 0,
          surveyData?.role || '',
          surveyData?.company || '',
          surveyData?.experience || '',
          surveyData?.newsletter ? 'Yes' : 'No',
          Array.isArray(surveyData?.interests) ? surveyData.interests.join('; ') : '',
          referrals.length,
          referredBy ? `${referredBy.name} (${referredBy.userId})` : ''
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map((row: (string | number)[]) =>
          row.map((field: string | number) => {
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `zurichjs-users-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Failed to export users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>ZurichJS - Admin Users</title>
      </Head>
      
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-gray-600">
              Manage users and view their survey information
            </p>
          </div>
          
          <OrganizationSwitcher />
        </div>
        
        {/* Toggle Stats Button */}
        <button 
          onClick={() => setShowStats(!showStats)}
          className="flex items-center mb-4 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {showStats ? (
            <>
              <ChevronUp size={16} className="mr-1" /> Hide User Statistics
            </>
          ) : (
            <>
              <ChevronDown size={16} className="mr-1" /> Show User Statistics
            </>
          )}
        </button>
        
        {/* User Statistics */}
        {showStats && <UserStats />}
        
        {/* Search & Stats */}
        <div className="mb-8 flex flex-col md:flex-row justify-between gap-4">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search users..."
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600"
            >
              Search
            </button>
          </form>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Total users: <span className="font-semibold">{pagination.total}</span></p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <Download size={16} className="mr-2" />
              {isLoading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
        
        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.imageUrl ? (
                            <img className="h-10 w-10 rounded-full" src={user.imageUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User size={20} className="text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.username || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.emailAddresses?.[0]?.emailAddress || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-1" />
                        {formatDate(user.lastSignInAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-1" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                        onClick={() => handleViewDetails(user.id)}
                        disabled={isLoading}
                      >
                        <UserCog size={16} className="mr-1" />
                        {isLoading ? 'Loading...' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'No users found matching your search criteria.' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    pagination.page >= pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{users.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <ArrowLeft size={20} />
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNumber: number;
                      
                      if (pagination.pages <= 5) {
                        // Show all pages if we have 5 or fewer
                        pageNumber = i + 1;
                      } else if (pagination.page <= 3) {
                        // We're near the start
                        pageNumber = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        // We're near the end
                        pageNumber = pagination.pages - 4 + i;
                      } else {
                        // We're in the middle
                        pageNumber = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.page === pageNumber
                              ? 'z-10 bg-yellow-50 border-yellow-500 text-yellow-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page >= pagination.pages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <ArrowRight size={20} />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Admin navigation links */}
        <div className="mt-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft size={16} className="mr-1" /> Back to Admin Dashboard
          </Link>
        </div>
      </div>
      
      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTimeout(() => setSelectedUser(null), 300); // Small delay to allow animation to complete
        }}
      />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { query = '', page = '1' } = context.query;
    const pageNumber = parseInt(page as string, 10) || 1;
    
    // Fetch users data from our API endpoint
    // Make sure we have a valid base URL - if not provided, construct absolute URL using request
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const host = context.req.headers.host;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    
    const apiUrl = `${baseUrl}/api/admin/users`;
    const fullUrl = `${apiUrl}?page=${pageNumber}&limit=10${query ? `&query=${query}` : ''}`;
    
    console.log('Fetching users from:', fullUrl);
    
    const res = await fetch(fullUrl);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch users: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Users API response data:', JSON.stringify(data).substring(0, 300) + '...');
    
    return {
      props: {
        users: data.users || [],
        pagination: data.pagination || {
          total: 0,
          pages: 0,
          page: 1,
          limit: 10,
        },
        searchQuery: query || '',
      },
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    
    // Return empty data on error
    return {
      props: {
        users: [],
        pagination: {
          total: 0,
          pages: 0,
          page: 1,
          limit: 10,
        },
        searchQuery: '',
      },
    };
  }
};
