import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, ExternalLink, Calendar, BookOpen, Link as LinkIcon, Download } from 'lucide-react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import { getWorkshops } from '@/data/workshops';
import { getEventsForUTM, UTMEvent } from '@/sanity/queries';

interface UTMLink {
  id: string;
  title: string;
  type: 'event' | 'workshop';
  url: string;
  utmLinks: Array<{
    platform: string;
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    utmUrl: string;
    icon: string;
    color: string;
  }>;
  metadata: {
    datetime?: string;
    location?: string;
    speakers?: Array<{ name: string; }>;
    dateInfo?: string;
    locationInfo?: string;
    speakerId?: string;
  };
}

interface UTMPreset {
  platform: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  icon: string;
  color: string;
}

const UTM_PRESETS: UTMPreset[] = [
  {
    platform: 'Twitter',
    source: 'twitter',
    medium: 'social',
    campaign: 'organic_social',
    content: 'twitter_post',
    icon: '🐦',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    platform: 'LinkedIn',
    source: 'linkedin',
    medium: 'social',
    campaign: 'organic_social',
    content: 'linkedin_post',
    icon: '💼',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    platform: 'Instagram',
    source: 'instagram',
    medium: 'social',
    campaign: 'organic_social',
    content: 'instagram_story',
    icon: '📸',
    color: 'bg-pink-100 text-pink-800'
  },
  {
    platform: 'Facebook',
    source: 'facebook',
    medium: 'social',
    campaign: 'organic_social',
    content: 'facebook_post',
    icon: '📘',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    platform: 'Newsletter',
    source: 'newsletter',
    medium: 'email',
    campaign: 'email_newsletter',
    content: 'monthly_newsletter',
    icon: '📧',
    color: 'bg-green-100 text-green-800'
  },
  {
    platform: 'YouTube',
    source: 'youtube',
    medium: 'video',
    campaign: 'organic_social',
    content: 'youtube_description',
    icon: '📺',
    color: 'bg-red-100 text-red-800'
  },
  {
    platform: 'Discord',
    source: 'discord',
    medium: 'social',
    campaign: 'community',
    content: 'discord_announcement',
    icon: '🎮',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    platform: 'Reddit',
    source: 'reddit',
    medium: 'social',
    campaign: 'organic_social',
    content: 'reddit_post',
    icon: '🔶',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    platform: 'Telegram',
    source: 'telegram',
    medium: 'social',
    campaign: 'community',
    content: 'telegram_channel',
    icon: '✈️',
    color: 'bg-blue-100 text-blue-800'
  }
];

interface UTMTrackingProps {
  events: UTMEvent[];
  workshops: Array<{
    id: string;
    title: string;
    dateInfo: string;
    locationInfo: string;
  }>;
  baseUrl: string;
  error?: string;
}

export default function UTMTracking({ events, workshops, baseUrl, error: serverError }: UTMTrackingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'event' | 'workshop'>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showGenerated, setShowGenerated] = useState(false);

  const generateUTMUrl = (baseUrl: string, preset: UTMPreset, title: string, type: 'event' | 'workshop'): string => {
    const params = new URLSearchParams({
      utm_source: preset.source,
      utm_medium: preset.medium,
      utm_campaign: preset.campaign,
      utm_content: preset.content || `${type}_${preset.source}`,
      utm_term: title.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '')
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // Process events and workshops into UTM links
  const processedLinks: UTMLink[] = [];

  // Process workshops
  workshops.forEach(workshop => {
    const workshopUrl = `${baseUrl}/workshops/${workshop.id}`;
    const utmLinks = UTM_PRESETS.map(preset => ({
      ...preset,
      utmUrl: generateUTMUrl(workshopUrl, preset, workshop.title, 'workshop')
    }));

    processedLinks.push({
      id: workshop.id,
      title: workshop.title,
      type: 'workshop',
      url: workshopUrl,
      utmLinks,
      metadata: {
        dateInfo: workshop.dateInfo,
        locationInfo: workshop.locationInfo
      }
    });
  });

  // Process events
  events.forEach(event => {
    const eventUrl = `${baseUrl}/events/${event.id}`;
    const utmLinks = UTM_PRESETS.map(preset => ({
      ...preset,
      utmUrl: generateUTMUrl(eventUrl, preset, event.title, 'event')
    }));

    processedLinks.push({
      id: event.id,
      title: event.title,
      type: 'event',
      url: eventUrl,
      utmLinks,
      metadata: {
        datetime: event.datetime,
        location: event.location,
        speakers: event.talks?.flatMap((talk) => talk.speakers || []) || []
      }
    });
  });

  const utmLinks = processedLinks;

  const copyToClipboard = async (text: string, itemId: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${platform} link copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const togglePlatform = (platform: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platform)) {
      newSelected.delete(platform);
    } else {
      newSelected.add(platform);
    }
    setSelectedPlatforms(newSelected);
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllPlatforms = () => {
    setSelectedPlatforms(new Set(UTM_PRESETS.map(p => p.platform)));
  };

  const clearAllPlatforms = () => {
    setSelectedPlatforms(new Set());
  };

  const selectAllItems = () => {
    const filteredItemIds = utmLinks
      .filter(link => filterType === 'all' || link.type === filterType)
      .filter(link => link.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(link => link.id);
    setSelectedItems(new Set(filteredItemIds));
  };

  const clearAllItems = () => {
    setSelectedItems(new Set());
  };

  const generateSelectedLinks = () => {
    setShowGenerated(true);
  };

  const resetSelection = () => {
    setShowGenerated(false);
    setSelectedPlatforms(new Set());
    setSelectedItems(new Set());
  };

  const exportToCSV = () => {
    const filteredData = utmLinks
      .filter(item => selectedItems.has(item.id))
      .flatMap(item => 
        item.utmLinks
          .filter(link => selectedPlatforms.has(link.platform))
          .map(link => ({
            Title: item.title,
            Type: item.type,
            Platform: link.platform,
            Source: link.source,
            Medium: link.medium,
            Campaign: link.campaign,
            Content: link.content || '',
            UTM_URL: link.utmUrl,
            Original_URL: item.url,
            Datetime: item.metadata.datetime || item.metadata.dateInfo || '',
            Location: item.metadata.location || item.metadata.locationInfo || '',
            Speakers: item.metadata.speakers?.map(s => s.name).join(', ') || ''
          }))
      );

    if (filteredData.length === 0) {
      setCopyFeedback('No data to export');
      setTimeout(() => setCopyFeedback(null), 2000);
      return;
    }

    const csvHeaders = Object.keys(filteredData[0] || {});
    const csvContent = [
      csvHeaders.join(','),
      ...filteredData.map(row => csvHeaders.map(header => {
        const value = row[header as keyof typeof row] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utm-tracking-links-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredLinks = utmLinks.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || link.type === filterType;
    return matchesSearch && matchesType;
  });

  const generatedLinks = utmLinks
    .filter(item => selectedItems.has(item.id))
    .map(item => ({
      ...item,
      utmLinks: item.utmLinks.filter(link => selectedPlatforms.has(link.platform))
    }))
    .filter(item => item.utmLinks.length > 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (serverError && utmLinks.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 mb-4">Error: {serverError}</p>
            <p className="text-red-600 text-sm">Please refresh the page to try again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="UTM Tracking Links Admin | ZurichJS" description="Generate UTM tracking links for events and workshops for social media sharing" />
      
      <div className="container mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/admin" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">UTM Tracking Links</h1>
              <p className="text-gray-600 mt-2">
                {showGenerated 
                  ? "Your generated UTM tracking links are ready!"
                  : "Generate UTM tracking links for events and workshops for social media sharing"
                }
              </p>
            </div>
          </div>
          {!showGenerated && (
            <div className="text-right text-sm text-gray-600">
              <p>{events.length + workshops.length} items available</p>
              <p>{UTM_PRESETS.length} platforms available</p>
            </div>
          )}
        </div>

        {/* Organization Switcher */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <OrganizationSwitcher />
          </div>
        </div>

        {!showGenerated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center">
                <LinkIcon className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Platforms</p>
                  <p className="text-2xl font-bold">{UTM_PRESETS.length}</p>
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
                <Calendar className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Events Available</p>
                  <p className="text-2xl font-bold">{events.length}</p>
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
                <BookOpen className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Workshops Available</p>
                  <p className="text-2xl font-bold">{workshops.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {!showGenerated ? (
          <>
            {/* Step 1: Platform Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Step 1: Select Social Media Platforms</h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllPlatforms}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAllPlatforms}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {UTM_PRESETS.map((preset) => (
                  <label
                    key={preset.platform}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlatforms.has(preset.platform)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.has(preset.platform)}
                      onChange={() => togglePlatform(preset.platform)}
                      className="sr-only"
                    />
                    <span className="text-lg mr-2">{preset.icon}</span>
                    <span className="text-sm font-medium">{preset.platform}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Selected: {selectedPlatforms.size} platforms
              </p>
            </div>

            {/* Step 2: Content Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Step 2: Select Events & Workshops</h2>
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'all' | 'event' | 'workshop')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="event">Events</option>
                    <option value="workshop">Workshops</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectAllItems}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Select All Visible
                </button>
                <button
                  onClick={clearAllItems}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Clear All
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLinks.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedItems.has(item.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'event' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'event' ? '📅 Event' : '🎓 Workshop'}
                        </span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {item.metadata.datetime && formatDate(item.metadata.datetime)}
                        {item.metadata.dateInfo && item.metadata.dateInfo}
                        {(item.metadata.location || item.metadata.locationInfo) && 
                          ` • ${item.metadata.location || item.metadata.locationInfo}`
                        }
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <p className="text-sm text-gray-600 mt-4">
                Selected: {selectedItems.size} items
              </p>
            </div>

            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={generateSelectedLinks}
                disabled={selectedPlatforms.size === 0 || selectedItems.size === 0}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Generate UTM Links ({selectedPlatforms.size} platforms × {selectedItems.size} items = {selectedPlatforms.size * selectedItems.size} links)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Generated Links View */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Generated UTM Links</h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={resetSelection}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Start Over
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Platforms Selected</p>
                  <p className="text-lg font-semibold">{selectedPlatforms.size}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Items Selected</p>
                  <p className="text-lg font-semibold">{selectedItems.size}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Links</p>
                  <p className="text-lg font-semibold">{generatedLinks.reduce((acc, item) => acc + item.utmLinks.length, 0)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Copy Feedback */}
        {copyFeedback && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            {copyFeedback}
          </div>
        )}

        {/* Warning Banner for partial errors */}
        {serverError && utmLinks.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <p className="text-yellow-800">{serverError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {showGenerated && (
          <>
            {/* Generated UTM Links List */}
            <div className="space-y-6">
              {generatedLinks.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          item.type === 'event' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'event' ? '📅 Event' : '🎓 Workshop'}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-800">{item.title}</h3>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                            {item.url}
                          </a>
                        </p>
                        {item.metadata.datetime && (
                          <p>📅 {formatDate(item.metadata.datetime)}</p>
                        )}
                        {item.metadata.dateInfo && (
                          <p>📅 {item.metadata.dateInfo}</p>
                        )}
                        {item.metadata.location && (
                          <p>📍 {item.metadata.location}</p>
                        )}
                        {item.metadata.locationInfo && (
                          <p>📍 {item.metadata.locationInfo}</p>
                        )}
                        {item.metadata.speakers && item.metadata.speakers.length > 0 && (
                          <p>👥 {item.metadata.speakers.map(s => s.name).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {item.utmLinks.map((link) => (
                      <div key={link.platform} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{link.icon}</span>
                            <span className="font-medium">{link.platform}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${link.color}`}>
                            {link.medium}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3 space-y-1">
                          <p><strong>Source:</strong> {link.source}</p>
                          <p><strong>Campaign:</strong> {link.campaign}</p>
                          {link.content && <p><strong>Content:</strong> {link.content}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={link.utmUrl}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(link.utmUrl, item.id, link.platform)}
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {generatedLinks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No links generated. Please go back and make your selections.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<UTMTrackingProps> = async ({ req }) => {
  // Get the base URL from the request
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  
  try {
    // Fetch events with limited data for UTM tracking
    const events = await getEventsForUTM({
      limit: 30,
      monthsBack: 6,
      monthsAhead: 12
    });
    
    // Get workshops data
    const workshops = getWorkshops();
    
    return {
      props: {
        events,
        workshops: workshops.map(workshop => ({
          id: workshop.id,
          title: workshop.title,
          dateInfo: workshop.dateInfo,
          locationInfo: workshop.locationInfo || 'TBD'
        })),
        baseUrl
      }
    };
  } catch (error) {
    console.error('Error fetching UTM tracking data:', error);
    
    // Return with only workshops if events fail
    const workshops = getWorkshops();
    
    return {
      props: {
        events: [],
        workshops: workshops.map(workshop => ({
          id: workshop.id,
          title: workshop.title,
          dateInfo: workshop.dateInfo,
          locationInfo: workshop.locationInfo || 'TBD'
        })),
        baseUrl,
        error: 'Events could not be loaded from Sanity CMS. Showing workshops only.'
      }
    };
  }
}; 