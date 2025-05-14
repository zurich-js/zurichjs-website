import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { ProductDemo } from '@/types';

interface ProductDemoHighlightProps {
  productDemos: ProductDemo[];
  isUpcoming?: boolean;
}

const ProductDemoHighlight: React.FC<ProductDemoHighlightProps> = ({ productDemos, isUpcoming = false }) => {
  if (!productDemos || productDemos.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 mb-2">
      <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
          <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
          <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        Featured Product Demo{productDemos.length > 1 ? 's' : ''}
        {isUpcoming && (
          <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center">
            <span className="animate-pulse mr-1">•</span> Upcoming
          </span>
        )}
      </h4>
      
      <div className="space-y-4">
        {productDemos.map((demo) => (
          <div key={demo._id} className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {demo.logo ? (
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-white rounded-lg p-2 border border-purple-100 shadow-sm overflow-hidden">
                  <Image 
                    src={demo.logo} 
                    alt={demo.name} 
                    fill
                    className="object-contain p-1"
                  />
                  {isUpcoming && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-bl-md">
                      NEW
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
              )}
              
              <div className="flex-grow text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h5 className="font-bold text-lg text-purple-900">{demo.name}</h5>
                  {isUpcoming && (
                    <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      <span className="animate-pulse mr-1">•</span> New
                    </span>
                  )}
                </div>
                
                {demo.description && (
                  <p className="text-sm text-gray-600 mt-1 mb-3 line-clamp-2">
                    {demo.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                  <a 
                    href={demo.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Visit Website <ExternalLink size={14} className="ml-1.5" />
                  </a>
                  
                  <span className="inline-flex items-center text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-md">
                    Featured Demo
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductDemoHighlight; 