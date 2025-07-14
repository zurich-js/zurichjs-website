import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, TrendingUp, Gift, Award, DollarSign, UserCheck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';

interface ReferralStats {
  totalReferrals: number;
  totalCreditsEarned: number;
  totalCreditsRedeemed: number;
  activeReferrers: number;
  conversionRate: number;
  recentReferrals: Array<{
    referrerName: string;
    referrerEmail: string;
    referredEmail: string;
    creditsEarned: number;
    date: string;
  }>;
}

interface TopReferrer {
  userId: string;
  name: string;
  email: string;
  totalReferrals: number;
  creditsEarned: number;
  joinDate: string;
}

interface RewardThreshold {
  name: string;
  creditsCost: number;
  description: string;
  redeemCount: number;
}

export default function ReferralProgramAdmin() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [rewardThresholds, setRewardThresholds] = useState<RewardThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/referral-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch referral data');
        }
        const data = await response.json();
        setStats(data.stats);
        setTopReferrers(data.topReferrers);
        setRewardThresholds(data.rewardThresholds);
      } catch (err) {
        console.error('Error fetching referral data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, []);

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
          <h1 className="text-3xl font-bold">Referral Program Admin</h1>
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
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
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
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Credits Earned</p>
                <p className="text-2xl font-bold">{stats?.totalCreditsEarned || 0}</p>
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
              <UserCheck className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Referrers</p>
                <p className="text-2xl font-bold">{stats?.activeReferrers || 0}</p>
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
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats?.conversionRate || 0}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Top Referrers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Top Referrers
            </h2>
            <div className="space-y-4">
              {topReferrers.map((referrer, index) => (
                <div key={referrer.userId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{referrer.name}</p>
                      <p className="text-sm text-gray-600">{referrer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{referrer.totalReferrals} referrals</p>
                    <p className="text-sm text-gray-600">{referrer.creditsEarned} credits</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Reward Thresholds */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Gift className="w-5 h-5 mr-2" />
              Reward Thresholds
            </h2>
            <div className="space-y-4">
              {rewardThresholds.map((reward, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{reward.name}</h3>
                    <span className="text-sm text-gray-600">{reward.creditsCost} credits</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                  <p className="text-sm text-green-600">Redeemed: {reward.redeemCount} times</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Recent Referrals
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Referrer</th>
                  <th className="text-left py-2">Referred User</th>
                  <th className="text-left py-2">Credits Earned</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentReferrals?.map((referral, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">
                      <div>
                        <p className="font-semibold">{referral.referrerName}</p>
                        <p className="text-sm text-gray-600">{referral.referrerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <p className="text-sm">{referral.referredEmail}</p>
                    </td>
                    <td className="py-3">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        +{referral.creditsEarned}
                      </span>
                    </td>
                    <td className="py-3">
                      <p className="text-sm text-gray-600">
                        {new Date(referral.date).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
} 