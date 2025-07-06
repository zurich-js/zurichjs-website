import { motion } from 'framer-motion';
import { Camera, Video, Calendar, MapPin, Users, ExternalLink, Play, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';

interface MediaItem {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'video';
  thumbnail: string;
  url: string;
  eventDate: string;
  eventTitle: string;
  location: string;
  attendees: number;
  tags: string[];
}

// Mock data - in a real app, this would come from a CMS
const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    title: 'React 18 Deep Dive Workshop',
    description: 'Amazing photos from our hands-on React 18 workshop where developers learned about concurrent features and automatic batching.',
    type: 'photo',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2024-01-15',
    eventTitle: 'React 18 Deep Dive Workshop',
    location: 'Impact Hub Zurich',
    attendees: 45,
    tags: ['React', 'Workshop', 'Frontend']
  },
  {
    id: '2',
    title: 'TypeScript Best Practices Talk',
    description: 'Watch the full presentation on TypeScript best practices and advanced patterns for enterprise applications.',
    type: 'video',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2024-01-10',
    eventTitle: 'TypeScript Best Practices',
    location: 'Google Zurich',
    attendees: 78,
    tags: ['TypeScript', 'Best Practices', 'Enterprise']
  },
  {
    id: '3',
    title: 'Node.js Performance Optimization',
    description: 'Beautiful moments captured during our Node.js performance optimization session with networking and pizza!',
    type: 'photo',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2024-01-05',
    eventTitle: 'Node.js Performance Workshop',
    location: 'Microsoft Switzerland',
    attendees: 32,
    tags: ['Node.js', 'Performance', 'Backend']
  },
  {
    id: '4',
    title: 'Vue.js vs React Panel Discussion',
    description: 'Full video recording of our lively panel discussion comparing Vue.js and React frameworks.',
    type: 'video',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2023-12-20',
    eventTitle: 'Vue.js vs React Panel',
    location: 'Digital Switzerland',
    attendees: 65,
    tags: ['Vue.js', 'React', 'Panel Discussion']
  },
  {
    id: '5',
    title: 'JavaScript Testing Strategies',
    description: 'Photos from our comprehensive testing workshop covering Jest, Cypress, and testing best practices.',
    type: 'photo',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2023-12-15',
    eventTitle: 'Testing Strategies Workshop',
    location: 'Swisscom',
    attendees: 28,
    tags: ['Testing', 'Jest', 'Cypress']
  },
  {
    id: '6',
    title: 'Web3 and JavaScript Integration',
    description: 'Complete video of our Web3 session where we explored blockchain integration with JavaScript.',
    type: 'video',
    thumbnail: '/api/og/home',
    url: '#',
    eventDate: '2023-12-10',
    eventTitle: 'Web3 JavaScript Integration',
    location: 'Crypto Valley Labs',
    attendees: 42,
    tags: ['Web3', 'Blockchain', 'JavaScript']
  }
];

export default function Media() {
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>(mockMediaItems);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let filtered = mockMediaItems;

    // Filter by type
    if (activeTab === 'photos') {
      filtered = filtered.filter(item => item.type === 'photo');
    } else if (activeTab === 'videos') {
      filtered = filtered.filter(item => item.type === 'video');
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.eventTitle.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredItems(filtered);
  }, [activeTab, searchQuery]);

  const handleTabChange = (tab: 'all' | 'photos' | 'videos') => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <SEO
        title="Photos & Videos | ZurichJS"
        description="Relive the amazing moments from ZurichJS events! Browse through photos and watch videos from our meetups, workshops, and talks."
        openGraph={{
          type: 'website',
          title: 'Photos & Videos | ZurichJS',
          description: 'Relive the amazing moments from ZurichJS events! Browse through photos and watch videos from our meetups, workshops, and talks.',
          image: '/api/og/home',
        }}
      />

      {/* Hero Section */}
      <Section variant="gradient" padding="lg" className="mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Relive the Magic! 📸🎥
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-900">
            Dive into our collection of photos and videos from past ZurichJS events. From epic workshops to inspiring talks, 
            capture the energy and excitement of our JavaScript community!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Camera className="w-5 h-5 mr-2" />
              <span className="font-medium">{mockMediaItems.filter(item => item.type === 'photo').length} Photo Albums</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Video className="w-5 h-5 mr-2" />
              <span className="font-medium">{mockMediaItems.filter(item => item.type === 'video').length} Video Recordings</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Media Gallery */}
      <Section variant="gray">
        {/* Tabs and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex mb-4 md:mb-0 bg-white rounded-lg shadow-sm p-1">
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('all')}
            >
              <span>All Media</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{mockMediaItems.length}</span>
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'photos'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('photos')}
            >
              <Camera size={16} />
              <span>Photos</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {mockMediaItems.filter(item => item.type === 'photo').length}
              </span>
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'videos'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('videos')}
            >
              <Video size={16} />
              <span>Videos</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {mockMediaItems.filter(item => item.type === 'video').length}
              </span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Media Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index % 3 * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-48 md:h-60 w-full">
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay with type indicator */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  
                  {/* Type badge */}
                  <div className="absolute top-3 left-3">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'video' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {item.type === 'video' ? <Play size={12} /> : <ImageIcon size={12} />}
                      {item.type === 'video' ? 'Video' : 'Photos'}
                    </div>
                  </div>

                  {/* Play button for videos */}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-3 group-hover:scale-110 transition-transform">
                        <Play size={24} className="text-red-500 ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {item.description}
                  </p>

                  {/* Event details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-2" />
                      <span>{formatDate(item.eventDate)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin size={14} className="mr-2" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users size={14} className="mr-2" />
                      <span>{item.attendees} attendees</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <Button
                    href={item.url}
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {item.type === 'video' ? 'Watch Video' : 'View Photos'}
                    <ExternalLink size={14} className="ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No media found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No media matching "${searchQuery}" found. Try adjusting your search.`
                : 'No media available for the selected category.'
              }
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              variant="primary"
            >
              View All Media
            </Button>
          </div>
        )}
      </Section>

      {/* Call to Action */}
      <Section variant="white">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Want to be part of our next event? 🚀
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join us at our upcoming meetups and workshops! Connect with fellow developers, 
              learn new skills, and maybe even become part of our photo and video collection!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button href="/events" variant="primary" size="lg">
                View Upcoming Events
              </Button>
              <Button href="/cfp" variant="secondary" size="lg">
                Submit a Talk
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>
    </Layout>
  );
} 