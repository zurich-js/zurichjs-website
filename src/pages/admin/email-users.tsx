import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Users, Copy, ExternalLink, Filter, Download } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRef } from 'react';

import Layout from '@/components/layout/Layout';

interface UserEmail {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActiveAt: string | null;
  surveyData?: {
    role?: string;
    company?: string;
    interests?: string[];
    experience?: string;
  };
}

export default function EmailAllUsers() {
  const [users, setUsers] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'new' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  // List of common JavaScript interests (from survey)
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
    'Other',
  ];
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestDropdownOpen, setInterestDropdownOpen] = useState(false);
  const interestDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        interestDropdownRef.current &&
        !interestDropdownRef.current.contains(event.target as Node)
      ) {
        setInterestDropdownOpen(false);
      }
    }
    if (interestDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [interestDropdownOpen]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/user-emails');
        if (!response.ok) {
          throw new Error('Failed to fetch user emails');
        }
        const data = await response.json();
        setUsers(data.users);
        // Select all users by default
        setSelectedUsers(data.users.map((user: UserEmail) => user.id));
      } catch (err) {
        console.error('Error fetching user emails:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBy]);

  // Filter users based on criteria
  const filteredUsers = users.filter(user => {
    // Text search filter
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Interest filter
    if (selectedInterests.length > 0) {
      const userInterests = user.surveyData?.interests || [];
      const hasInterest = selectedInterests.some(interest => userInterests.includes(interest));
      if (!hasInterest) return false;
    }

    // Status filter
    switch (filterBy) {
      case 'active':
        return user.lastActiveAt && 
               (new Date().getTime() - new Date(user.lastActiveAt).getTime()) <= 30 * 24 * 60 * 60 * 1000;
      case 'new':
        return (new Date().getTime() - new Date(user.joinDate).getTime()) <= 30 * 24 * 60 * 60 * 1000;
      case 'inactive':
        return !user.lastActiveAt || 
               (new Date().getTime() - new Date(user.lastActiveAt).getTime()) > 90 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Get selected user emails (from all pages)
  const selectedUserEmails = filteredUsers
    .filter(user => selectedUsers.includes(user.id))
    .map(user => user.email);

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleSelectCurrentPage = () => {
    const currentPageUserIds = currentUsers.map(user => user.id);
    const allCurrentPageSelected = currentPageUserIds.every(id => selectedUsers.includes(id));
    
    if (allCurrentPageSelected) {
      // Deselect all users on current page
      setSelectedUsers(prev => prev.filter(id => !currentPageUserIds.includes(id)));
    } else {
      // Select all users on current page
      setSelectedUsers(prev => {
        const newSelections = currentPageUserIds.filter(id => !prev.includes(id));
        return [...prev, ...newSelections];
      });
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const copyEmailsToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(selectedUserEmails.join(', '));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy emails:', err);
    }
  };

  const openGmail = () => {
    const emailList = selectedUserEmails.join(',');
    // Use BCC for all emails
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(emailList)}`;
    window.open(gmailUrl, '_blank');
  };

  const downloadEmailList = () => {
    const csvContent = 'Name,Email,Join Date,Last Active\n' + 
      filteredUsers
        .filter(user => selectedUsers.includes(user.id))
        .map(user => `"${user.name}","${user.email}","${user.joinDate}","${user.lastActiveAt || 'Never'}"`)
        .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zurichjs-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/admin" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </Link>
          <h1 className="text-3xl font-bold">Email All Users</h1>
        </div>

        {/* Organization Switcher */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <OrganizationSwitcher />
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <Filter className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Filtered Users</p>
                <p className="text-2xl font-bold">{filteredUsers.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Selected Users</p>
                <p className="text-2xl font-bold">{selectedUsers.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="active">Active (30 days)</option>
                <option value="new">New (30 days)</option>
                <option value="inactive">Inactive (90+ days)</option>
              </select>
              {/* Interest filter */}
              <div className="relative" ref={interestDropdownRef}>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 flex items-center gap-2 min-w-[180px] flex-wrap"
                  onClick={() => setInterestDropdownOpen((open) => !open)}
                >
                  <span>Filter by Interest</span>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {selectedInterests.map(interest => (
                      <span
                        key={interest}
                        className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        {interest}
                        <button
                          type="button"
                          className="ml-1 text-yellow-700 hover:text-yellow-900 focus:outline-none"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedInterests(prev => prev.filter(i => i !== interest));
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{selectedInterests.length > 0 ? `(${selectedInterests.length})` : ''}</span>
                </button>
                {interestDropdownOpen && (
                  <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {interestOptions.map(interest => (
                        <label key={interest} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedInterests.includes(interest)}
                            onChange={() => {
                              setSelectedInterests(prev =>
                                prev.includes(interest)
                                  ? prev.filter(i => i !== interest)
                                  : [...prev, interest]
                              );
                            }}
                            className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{interest}</span>
                        </label>
                      ))}
                    </div>
                    {selectedInterests.length > 0 && (
                      <button
                        type="button"
                        className="mt-3 px-3 py-1 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200"
                        onClick={() => setSelectedInterests([])}
                      >
                        Clear Interests
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleSelectCurrentPage}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {currentUsers.every(user => selectedUsers.includes(user.id)) ? 'Deselect Page' : 'Select Page'}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={openGmail}
              disabled={selectedUserEmails.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="w-5 h-5" />
              Open Gmail ({selectedUserEmails.length} emails)
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={copyEmailsToClipboard}
              disabled={selectedUserEmails.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Copy className="w-5 h-5" />
              {copySuccess ? 'Copied!' : 'Copy Emails'}
            </button>
            <button
              onClick={downloadEmailList}
              disabled={selectedUserEmails.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">
                    <input
                      type="checkbox"
                      checked={currentUsers.length > 0 && currentUsers.every(user => selectedUsers.includes(user.id))}
                      onChange={handleSelectCurrentPage}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Join Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Active</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Company</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {new Date(user.joinDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {user.surveyData?.role || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {user.surveyData?.company || 'N/A'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email Preview */}
        {selectedUserEmails.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Selected Emails Preview</h3>
            <div className="bg-white rounded p-4 max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-600 break-all">
                {selectedUserEmails.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 