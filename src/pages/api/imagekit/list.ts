import ImageKit from "imagekit";
import { NextApiRequest, NextApiResponse } from 'next';

import { generateThumbnail, isVideoFile } from '../../../utils/thumbnailGenerator';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
            urlEndpoint: process.env.IMAGEKIT_ENDPOINT || "",
        });

        const list = await imagekit.listFiles({
            limit: 1000, // Increase limit to get more files
            sort: 'DESC_CREATED' // Sort by creation date descending
        });
        
        const filesByFolder: Record<string, any[]> = {};
        
        list.forEach((file: any) => {
            if (file.filePath) {
                // Extract folder from filePath (e.g., '/zurichjs-5/DSC02185.png' -> 'zurichjs-5')
                const pathParts = file.filePath.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    const folder = pathParts[0];
                    if (!filesByFolder[folder]) {
                        filesByFolder[folder] = [];
                    }
                    
                    const isVideo = isVideoFile(file.name);
                    
                    // Get actual dimensions from ImageKit or calculate from metadata
                    const actualWidth = file.width || file.metadata?.width || (isVideo ? 1920 : 1200);
                    const actualHeight = file.height || file.metadata?.height || (isVideo ? 1080 : 800);
                    
                    // Calculate aspect ratio for consistent display
                    const aspectRatio = actualWidth / actualHeight;
                    
                    // Enhance file object with additional metadata and multiple thumbnail sizes
                    const enhancedFile = {
                        ...file,
                        isVideo,
                        // Use actual dimensions from ImageKit
                        width: actualWidth,
                        height: actualHeight,
                        aspectRatio,
                        // Generate multiple thumbnail sizes for different use cases using centralized utility
                        thumbnailUrl: generateThumbnail(file.url, isVideo, 'medium'),
                        thumbnailUrlSmall: generateThumbnail(file.url, isVideo, 'small'),
                        thumbnailUrlLarge: generateThumbnail(file.url, isVideo, 'large'),
                        // Add fallback URL for when thumbnail generation fails
                        fallbackUrl: file.url,
                        duration: file.duration || (isVideo ? 120 : undefined), // Default duration for videos
                        tags: file.tags || [],
                        fileSize: file.size || 0,
                        mimeType: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg')
                    };
                    
                    filesByFolder[folder].push(enhancedFile);
                }
            }
        });

        // Sort files within each folder by creation date
        Object.keys(filesByFolder).forEach(folder => {
            filesByFolder[folder].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        });

        return res.status(200).json(filesByFolder);
    } catch (error) {
        console.error('Error fetching ImageKit files:', error);
        return res.status(500).json({ message: 'Error fetching files' });
    }
}