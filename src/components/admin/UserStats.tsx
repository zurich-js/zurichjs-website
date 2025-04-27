import { Calendar, Users, Award, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InterestStat {
  name: string;
  count: number;
}

interface UserStatsData {
  totalUsers: number;
  activeUsers: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  surveyStats: {
    totalSubmitted: number;
    roleDistribution: Record<string, number>;
    experienceDistribution: Record<string, number>;
    newsletterSubscribers: number;
    topInterests: InterestStat[];
  };
}

export default function UserStats() {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/admin/user-stats');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-500">Loading statistics...</div>
        </div>
      </div>
    );
  }
  
  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-center h-40">
          <div className="text-red-500">{error || 'Failed to load statistics'}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h3 className="text-xl font-semibold mb-6">User Statistics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users Card */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-blue-800">Total Users</h4>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
        </div>
        
        {/* Active Users Card */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="text-sm font-medium text-green-800">Active Last 7 Days</h4>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.activeUsers.last7Days}</p>
          <div className="mt-2 text-xs text-green-700">
            <span className="inline-block mr-2">24h: {stats.activeUsers.last24Hours}</span>
            <span className="inline-block">30d: {stats.activeUsers.last30Days}</span>
          </div>
        </div>
        
        {/* Survey Submissions Card */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Award className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="text-sm font-medium text-purple-800">Survey Submissions</h4>
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.surveyStats.totalSubmitted}</p>
          <div className="mt-2 text-xs text-purple-700">
            {stats.totalUsers > 0 ? (
              <span>{Math.round((stats.surveyStats.totalSubmitted / stats.totalUsers) * 100)}% of users</span>
            ) : (
              <span>0% of users</span>
            )}
          </div>
        </div>
        
        {/* Newsletter Card */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Mail className="w-5 h-5 text-yellow-600 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800">Newsletter Subscribers</h4>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{stats.surveyStats.newsletterSubscribers}</p>
          <div className="mt-2 text-xs text-yellow-700">
            {stats.surveyStats.totalSubmitted > 0 ? (
              <span>{Math.round((stats.surveyStats.newsletterSubscribers / stats.surveyStats.totalSubmitted) * 100)}% of survey submissions</span>
            ) : (
              <span>0% of survey submissions</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Top Interests */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Interests</h4>
        <div className="flex flex-wrap gap-2">
          {stats.surveyStats.topInterests.map((interest) => (
            <div 
              key={interest.name}
              className="bg-gray-100 rounded-full px-3 py-1 text-xs"
            >
              {interest.name} <span className="font-semibold">{interest.count}</span>
            </div>
          ))}
          
          {stats.surveyStats.topInterests.length === 0 && (
            <div className="text-sm text-gray-500">No interests data available</div>
          )}
        </div>
      </div>
      
      {/* Role Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Role Distribution</h4>
          <div className="space-y-2">
            {Object.entries(stats.surveyStats.roleDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{role}</span>
                  <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))}
            
            {Object.keys(stats.surveyStats.roleDistribution).length === 0 && (
              <div className="text-sm text-gray-500">No role data available</div>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Experience Distribution</h4>
          <div className="space-y-2">
            {Object.entries(stats.surveyStats.experienceDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([experience, count]) => (
                <div key={experience} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{experience}</span>
                  <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))}
            
            {Object.keys(stats.surveyStats.experienceDistribution).length === 0 && (
              <div className="text-sm text-gray-500">No experience data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 