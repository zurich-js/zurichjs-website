import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Tag, ArrowLeft, Plus, Eye, Trash2, Percent, DollarSign, Users, TrendingUp, Copy, Link as LinkIcon, Code } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';

interface StripeCoupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  valid: boolean;
  created: number;
  redeem_by: number | null;
  metadata: Record<string, string>;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  mostUsedCoupon: {
    id: string;
    name: string | null;
    times_redeemed: number;
  } | null;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<StripeCoupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<StripeCoupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCopyDropdown, setShowCopyDropdown] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  // Coupon creation form state
  const [newCoupon, setNewCoupon] = useState({
    id: '',
    name: '',
    discountType: 'percent' as 'percent' | 'amount',
    percentOff: '',
    amountOff: '',
    currency: 'usd',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: '',
    maxRedemptions: '',
    redeemBy: '',
    metadata: {} as Record<string, string>
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/stripe-coupons');
        if (!response.ok) {
          throw new Error('Failed to fetch coupons');
        }
        const data = await response.json();
        setCoupons(data.coupons);
        setStats(data.stats);
      } catch (err) {
        console.error('Error fetching coupons:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  // Handle escape key to close modals and dropdowns
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };

    if (showDetailsModal || showDeleteModal || showCreateModal || showCopyDropdown) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDetailsModal, showDeleteModal, showCreateModal, showCopyDropdown]);

  // Handle click outside to close copy dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showCopyDropdown) {
        const target = e.target as Element;
        if (!target.closest('.copy-dropdown')) {
          setShowCopyDropdown(null);
        }
      }
    };

    if (showCopyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCopyDropdown]);

  // Filter coupons based on criteria
  const filteredCoupons = coupons.filter(coupon => {
    // Text search filter
    const matchesSearch = coupon.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (coupon.name && coupon.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Status filter
    const now = Date.now() / 1000; // Convert to seconds
    switch (filterBy) {
      case 'active':
        return coupon.valid && (!coupon.redeem_by || coupon.redeem_by > now);
      case 'inactive':
        return !coupon.valid;
      case 'expired':
        return coupon.redeem_by && coupon.redeem_by <= now;
      default:
        return true;
    }
  });

  const formatDiscount = (coupon: StripeCoupon) => {
    if (coupon.percent_off) {
      return `${coupon.percent_off}% off`;
    } else if (coupon.amount_off && coupon.currency) {
      return `${(coupon.amount_off / 100).toFixed(2)} ${coupon.currency.toUpperCase()} off`;
    }
    return 'Unknown discount';
  };

  const formatDuration = (coupon: StripeCoupon) => {
    switch (coupon.duration) {
      case 'once':
        return 'One time use';
      case 'repeating':
        return `${coupon.duration_in_months} months`;
      case 'forever':
        return 'Forever';
      default:
        return coupon.duration;
    }
  };

  const getCouponStatus = (coupon: StripeCoupon) => {
    if (!coupon.valid) {
      return { status: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    }
    
    const now = Date.now() / 1000;
    if (coupon.redeem_by && coupon.redeem_by <= now) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    }
    
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return { status: 'Limit Reached', color: 'bg-orange-100 text-orange-800' };
    }
    
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const handleViewDetails = (coupon: StripeCoupon) => {
    setSelectedCoupon(coupon);
    setShowDetailsModal(true);
  };

  const handleDeleteCoupon = (coupon: StripeCoupon) => {
    setSelectedCoupon(coupon);
    setShowDeleteModal(true);
  };

  const confirmDeleteCoupon = async () => {
    if (!selectedCoupon) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/stripe-coupons/${selectedCoupon.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }
      
      // Remove coupon from local state
      setCoupons(prev => prev.filter(c => c.id !== selectedCoupon.id));
      setShowDeleteModal(false);
      setSelectedCoupon(null);
    } catch (err) {
      console.error('Error deleting coupon:', err);
      alert('Failed to delete coupon. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowDetailsModal(false);
    setShowDeleteModal(false);
    setShowCreateModal(false);
    setSelectedCoupon(null);
    setShowCopyDropdown(null);
  };

  const handleCopyToClipboard = async (text: string, type: 'url' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${type === 'url' ? 'URL' : 'Code'} copied to clipboard!`);
      setShowCopyDropdown(null);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyFeedback('Failed to copy to clipboard');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleCopyUrl = (couponCode: string) => {
    const url = `?coupon=${couponCode}`;
    handleCopyToClipboard(url, 'url');
  };

  const handleCopyCode = (couponCode: string) => {
    handleCopyToClipboard(couponCode, 'code');
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCreateLoading(true);
      const response = await fetch('/api/admin/stripe-coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCoupon),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create coupon');
      }
      
      const data = await response.json();
      
      // Add new coupon to the list
      setCoupons(prev => [data.coupon, ...prev]);
      
      // Reset form
      setNewCoupon({
        id: '',
        name: '',
        discountType: 'percent',
        percentOff: '',
        amountOff: '',
        currency: 'usd',
        duration: 'once',
        durationInMonths: '',
        maxRedemptions: '',
        redeemBy: '',
        metadata: {}
      });
      
      setShowCreateModal(false);
      setCopyFeedback('Coupon created successfully!');
      setTimeout(() => setCopyFeedback(null), 3000);
      
    } catch (error) {
      console.error('Error creating coupon:', error);
      setCopyFeedback(`Error: ${error instanceof Error ? error.message : 'Failed to create coupon'}`);
      setTimeout(() => setCopyFeedback(null), 5000);
    } finally {
      setCreateLoading(false);
    }
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/admin" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
            </Link>
            <h1 className="text-3xl font-bold">Coupon Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Coupon
          </button>
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
              <Tag className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Coupons</p>
                <p className="text-2xl font-bold">{stats?.totalCoupons || 0}</p>
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
              <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Coupons</p>
                <p className="text-2xl font-bold">{stats?.activeCoupons || 0}</p>
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
              <Users className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Redemptions</p>
                <p className="text-2xl font-bold">{stats?.totalRedemptions || 0}</p>
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
              <DollarSign className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Most Used</p>
                <p className="text-lg font-bold">{stats?.mostUsedCoupon?.id || 'None'}</p>
                <p className="text-xs text-gray-500">{stats?.mostUsedCoupon?.times_redeemed || 0} uses</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Coupons</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredCoupons.length} of {coupons.length} coupons
            </div>
          </div>
        </div>

        {/* Copy Feedback */}
        {copyFeedback && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-md z-50">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              {copyFeedback}
            </div>
          </div>
        )}

        {/* Coupons Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Coupon Code</th>
                  <th className="text-left py-3 px-4 font-semibold">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold">Usage</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Created</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const { status, color } = getCouponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold font-mono">{coupon.id}</p>
                          {coupon.name && <p className="text-sm text-gray-600">{coupon.name}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {coupon.percent_off ? (
                            <Percent className="w-4 h-4 text-green-600 mr-1" />
                          ) : (
                            <DollarSign className="w-4 h-4 text-blue-600 mr-1" />
                          )}
                          <span className="font-semibold">{formatDiscount(coupon)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">{formatDuration(coupon)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold">{coupon.times_redeemed}</p>
                          {coupon.max_redemptions && (
                            <p className="text-sm text-gray-600">/ {coupon.max_redemptions} max</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-600">
                          {new Date(coupon.created * 1000).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(coupon)}
                            title="View Details"
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative copy-dropdown">
                            <button
                              onClick={() => setShowCopyDropdown(showCopyDropdown === coupon.id ? null : coupon.id)}
                              title="Copy Coupon"
                              className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {showCopyDropdown === coupon.id && (
                              <div className="absolute right-0 top-6 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleCopyUrl(coupon.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                    Copy URL Parameter
                                  </button>
                                  <button
                                    onClick={() => handleCopyCode(coupon.id)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Code className="w-4 h-4" />
                                    Copy Raw Code
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCoupon(coupon)}
                            title="Delete Coupon"
                            className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Details Modal */}
        {showDetailsModal && selectedCoupon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Coupon Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                    <p className="font-mono text-lg font-semibold">{selectedCoupon.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{selectedCoupon.name || 'No name set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                    <p className="text-gray-900 font-semibold">{formatDiscount(selectedCoupon)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <p className="text-gray-900">{formatDuration(selectedCoupon)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Times Redeemed</label>
                    <p className="text-gray-900">{selectedCoupon.times_redeemed}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Redemptions</label>
                    <p className="text-gray-900">{selectedCoupon.max_redemptions || 'Unlimited'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getCouponStatus(selectedCoupon).color}`}>
                      {getCouponStatus(selectedCoupon).status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{new Date(selectedCoupon.created * 1000).toLocaleDateString()}</p>
                  </div>
                  {selectedCoupon.redeem_by && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                      <p className="text-gray-900">{new Date(selectedCoupon.redeem_by * 1000).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {selectedCoupon.metadata && Object.keys(selectedCoupon.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Metadata</label>
                    <div className="bg-gray-50 rounded p-3">
                      {Object.entries(selectedCoupon.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1">
                          <span className="font-medium">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedCoupon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4 text-red-600">Confirm Deletion</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the coupon <span className="font-mono font-semibold">{selectedCoupon.id}</span>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. The coupon will be permanently deleted from Stripe.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeAllModals}
                  disabled={actionLoading}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCoupon}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {actionLoading ? 'Deleting...' : 'Delete Coupon'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Coupon Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Create New Coupon</h3>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coupon ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      value={newCoupon.id}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SUMMER2024"
                      required
                    />
                  </div>

                  {/* Coupon Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newCoupon.name}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Summer 2024 Discount"
                    />
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={newCoupon.discountType}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, discountType: e.target.value as 'percent' | 'amount' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="percent">Percentage Off</option>
                      <option value="amount">Fixed Amount Off</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {newCoupon.discountType === 'percent' ? 'Percentage Off (%)' : 'Amount Off'} *
                    </label>
                    <div className="flex">
                      {newCoupon.discountType === 'percent' ? (
                        <input
                          type="number"
                          value={newCoupon.percentOff}
                          onChange={(e) => setNewCoupon(prev => ({ ...prev, percentOff: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10"
                          min="1"
                          max="100"
                          required
                        />
                      ) : (
                        <div className="flex w-full">
                          <input
                            type="number"
                            value={newCoupon.amountOff}
                            onChange={(e) => setNewCoupon(prev => ({ ...prev, amountOff: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="10.00"
                            min="0.01"
                            step="0.01"
                            required
                          />
                          <select
                            value={newCoupon.currency}
                            onChange={(e) => setNewCoupon(prev => ({ ...prev, currency: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="usd">USD</option>
                            <option value="eur">EUR</option>
                            <option value="chf">CHF</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <select
                      value={newCoupon.duration}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, duration: e.target.value as 'once' | 'repeating' | 'forever' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="once">One-time use</option>
                      <option value="repeating">Repeating (months)</option>
                      <option value="forever">Forever</option>
                    </select>
                  </div>

                  {/* Duration in Months */}
                  {newCoupon.duration === 'repeating' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration in Months *
                      </label>
                      <input
                        type="number"
                        value={newCoupon.durationInMonths}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, durationInMonths: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3"
                        min="1"
                        required
                      />
                    </div>
                  )}

                  {/* Max Redemptions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Redemptions
                    </label>
                    <input
                      type="number"
                      value={newCoupon.maxRedemptions}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, maxRedemptions: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                  </div>

                  {/* Expiration Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newCoupon.redeemBy}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, redeemBy: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={closeAllModals}
                    disabled={createLoading}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {createLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {createLoading ? 'Creating...' : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 