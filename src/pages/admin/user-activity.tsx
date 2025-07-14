import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Activity, TrendingUp, Clock, UserPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';

interface UserActivityData {
  userId: string;
  name: string;
  email: string;
  joinDate: string;
  lastActiveAt: string | null;
  lastSignInAt: string | null;
  activityScore: number;
  events: {
    eventName: string;
    eventType: string;
    timestamp: string;
  }[];
}

interface ActivityStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  avgActivityScore: number;
  topActiveUsers: UserActivityData[];
  recentActivity: {
    userId: string;
    userName: string;
    activity: string;
    timestamp: string;
  }[];
}

export default function UserActivityMonitor() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [users, setUsers] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'activityScore' | 'lastActive'>('activityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/user-activity');
        if (!response.ok) {
          throw new Error('Failed to fetch user activity data');
        }
        const data = await response.json();
        setStats(data.stats);
        setUsers(data.users);
      } catch (err) {
        console.error('Error fetching user activity:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserActivity();
  }, []);

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'joinDate':
          aValue = new Date(a.joinDate).getTime();
          bValue = new Date(b.joinDate).getTime();
          break;
        case 'activityScore':
          aValue = a.activityScore;
          bValue = b.activityScore;
          break;
        case 'lastActive':
          aValue = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          bValue = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          break;
        default:
          aValue = a.activityScore;
          bValue = b.activityScore;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

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
          <h1 className="text-3xl font-bold">User Activity Monitor</h1>
        </div>

        {/* Organization Switcher */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <OrganizationSwitcher />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
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
              <Activity className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
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
              <UserPlus className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">New This Month</p>
                <p className="text-2xl font-bold">{stats?.newUsersThisMonth || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Activity Score</p>
                <p className="text-2xl font-bold">{stats?.avgActivityScore || 0}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Activity Score Explanation */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">How Activity Score is Calculated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h3 className="font-semibold mb-2">Base Score Components:</h3>
              <ul className="space-y-1">
                <li>• Account creation: +10 points</li>
                <li>• Recent activity (7 days): +30 points</li>
                <li>• Recent activity (30 days): +20 points</li>
                <li>• Recent activity (90 days): +10 points</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Engagement Bonuses:</h3>
              <ul className="space-y-1">
                <li>• Recent sign-in (7 days): +25 points</li>
                <li>• Recent sign-in (30 days): +15 points</li>
                <li>• Credits earned: +0.1 per credit (max 20)</li>
                <li>• Referrals made: +5 per referral (max 15)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="activityScore">Activity Score</option>
                  <option value="name">Name</option>
                  <option value="joinDate">Join Date</option>
                  <option value="lastActive">Last Active</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2">Order:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Activity Score</th>
                  <th className="text-left py-3 px-4 font-semibold">Join Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Active</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Sign In</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.userId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(user.activityScore, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{user.activityScore}</span>
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
                        {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {stats?.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">{activity.userName}</p>
                  <p className="text-sm text-gray-600">{activity.activity}</p>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
} 