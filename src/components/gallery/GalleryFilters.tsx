import { Search, Filter, Calendar, Camera, Video, X } from 'lucide-react';

import { EventType, MediaType, TimePeriod, SortOption, GalleryFilters } from '../../types/gallery';
import { formatEventType, formatMediaType } from '../../utils/galleryFormatters';

interface GalleryFiltersProps {
  filters: GalleryFilters;
  onFiltersChange: (filters: Partial<GalleryFilters>) => void;
  onClearFilters: () => void;
}

export default function GalleryFiltersComponent({ filters, onFiltersChange, onClearFilters }: GalleryFiltersProps) {
  const hasActiveFilters = filters.eventType !== EventType.ALL || 
                          filters.mediaType !== MediaType.ALL || 
                          filters.timePeriod !== TimePeriod.ALL || 
                          filters.searchQuery !== '';

  return (
    <div className="mb-8">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
          placeholder="Search gallery..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="form-input w-full pl-10 pr-4 py-3 text-base"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Event Type Filter */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <select
            value={filters.eventType}
            onChange={(e) => onFiltersChange({ eventType: e.target.value as EventType })}
              className="form-select w-full pl-10 pr-8 py-2 text-sm"
          >
            {Object.values(EventType).map((type) => (
                <option key={type} value={type}>
                {formatEventType(type)}
                </option>
            ))}
            </select>
          </div>
        </div>

        {/* Media Type Filter */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Media Type</label>
          <div className="relative">
            {filters.mediaType === MediaType.PHOTO ? (
              <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            ) : filters.mediaType === MediaType.VIDEO ? (
              <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            ) : (
              <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            )}
            <select
            value={filters.mediaType}
            onChange={(e) => onFiltersChange({ mediaType: e.target.value as MediaType })}
              className="form-select w-full pl-10 pr-8 py-2 text-sm"
          >
            {Object.values(MediaType).map((type) => (
                <option key={type} value={type}>
                {formatMediaType(type)}
                </option>
            ))}
            </select>
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
          <select
            value={filters.timePeriod}
            onChange={(e) => onFiltersChange({ timePeriod: e.target.value as TimePeriod })}
            className="form-select w-full py-2 text-sm"
          >
            <option value={TimePeriod.ALL}>All Time</option>
            <option value={TimePeriod.RECENT}>Recent</option>
            <option value={TimePeriod.THIS_YEAR}>This Year</option>
            <option value={TimePeriod.LAST_YEAR}>Last Year</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value as SortOption })}
            className="form-select w-full py-2 text-sm"
          >
            <option value={SortOption.DATE_DESC}>Newest First</option>
            <option value={SortOption.DATE_ASC}>Oldest First</option>
            <option value={SortOption.EVENT_NAME}>Event Name</option>
            <option value={SortOption.POPULARITY}>Most Popular</option>
          </select>
        </div>
      </div>

      {/* Active Filters & Clear */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center text-gray-600">
            <Filter size={16} className="mr-2" />
            <span className="text-sm font-medium">Active filters:</span>
          </div>
          
          {filters.eventType !== EventType.ALL && (
            <div className="filter-chip filter-chip-active">
              <span>{formatEventType(filters.eventType)}</span>
              <button
                onClick={() => onFiltersChange({ eventType: EventType.ALL })}
                className="icon-button p-0.5 hover:bg-blue-300 rounded-full"
                aria-label="Remove event type filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {filters.mediaType !== MediaType.ALL && (
            <div className="filter-chip filter-chip-active">
              <span>{formatMediaType(filters.mediaType)}</span>
              <button
                onClick={() => onFiltersChange({ mediaType: MediaType.ALL })}
                className="icon-button p-0.5 hover:bg-blue-300 rounded-full"
                aria-label="Remove media type filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {filters.timePeriod !== TimePeriod.ALL && (
            <div className="filter-chip filter-chip-active">
              <span>{filters.timePeriod.replace('_', ' ')}</span>
              <button
                onClick={() => onFiltersChange({ timePeriod: TimePeriod.ALL })}
                className="icon-button p-0.5 hover:bg-blue-300 rounded-full"
                aria-label="Remove time period filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {filters.searchQuery && (
            <div className="filter-chip filter-chip-active">
              <span>&quot;{filters.searchQuery}&quot;</span>
              <button
                onClick={() => onFiltersChange({ searchQuery: '' })}
                className="icon-button p-0.5 hover:bg-blue-300 rounded-full"
                aria-label="Remove search filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <button
            onClick={onClearFilters}
            className="btn-outline ml-2 px-3 py-1 text-sm"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}