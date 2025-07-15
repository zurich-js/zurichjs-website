import React from 'react';
import GalleryPage from './src/pages/gallery';
import { mockRootProps } from './src/data/galleryMockData';

export default function GalleryPreview() {
  return <GalleryPage {...mockRootProps} />;
}