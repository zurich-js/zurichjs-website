import ImageKit from "imagekit";
import { NextApiRequest, NextApiResponse } from 'next';

import { ImageKitFile } from '../../../types/gallery';
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
        
        const filesByFolder: Record<string, ImageKitFile[]> = {};
        
        list.forEach((file: unknown) => {
            // Type guard to ensure we're working with a file object, not a folder
            const fileObj = file as Record<string, unknown>;
            if (fileObj.filePath && fileObj.fileId && fileObj.url) {
                // Extract folder from filePath (e.g., '/zurichjs-5/DSC02185.png' -> 'zurichjs-5')
                const pathParts = (fileObj.filePath as string).split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    const folder = pathParts[0];
                    if (!filesByFolder[folder]) {
                        filesByFolder[folder] = [];
                    }
                    
                    const isVideo = isVideoFile(fileObj.name as string);
                    
                    // Get actual dimensions from ImageKit or calculate from metadata
                    const metadata = fileObj.metadata as { width?: number; height?: number } | undefined;
                    const actualWidth = (fileObj.width as number) || metadata?.width || (isVideo ? 1920 : 1200);
                    const actualHeight = (fileObj.height as number) || metadata?.height || (isVideo ? 1080 : 800);
                    
                    // Calculate aspect ratio for consistent display
                    const aspectRatio = actualWidth / actualHeight;
                    
                    // Enhance file object with additional metadata and multiple thumbnail sizes
                    const enhancedFile: ImageKitFile = {
                        fileId: fileObj.fileId as string,
                        name: fileObj.name as string,
                        filePath: fileObj.filePath as string,
                        url: fileObj.url as string,
                        createdAt: fileObj.createdAt as string,
                        updatedAt: fileObj.updatedAt as string | undefined,
                        metadata,
                        isVideo,
                        // Use actual dimensions from ImageKit
                        width: actualWidth,
                        height: actualHeight,
                        aspectRatio,
                        // Generate multiple thumbnail sizes for different use cases using centralized utility
                        thumbnailUrl: generateThumbnail(fileObj.url as string, isVideo, 'medium'),
                        thumbnailUrlSmall: generateThumbnail(fileObj.url as string, isVideo, 'small'),
                        thumbnailUrlLarge: generateThumbnail(fileObj.url as string, isVideo, 'large'),
                        // Add fallback URL for when thumbnail generation fails
                        fallbackUrl: fileObj.url as string,
                        duration: (fileObj.duration as number) || (isVideo ? 120 : undefined), // Default duration for videos
                        tags: (fileObj.tags as string[]) || undefined, // Convert null to undefined to match interface
                        fileSize: (fileObj.size as number) || 0,
                        mimeType: (fileObj.mimeType as string) || (isVideo ? 'video/mp4' : 'image/jpeg')
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