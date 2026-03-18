import type { APIContext } from 'astro';
import ImageKit from "imagekit";

import { ImageKitFile } from '../../../types/gallery';
import { isVideoFile, getAllThumbnailSizes } from '../../../utils/thumbnailGenerator';

export const prerender = false;

export async function GET(context: APIContext) {
    try {
        const imagekit = new ImageKit({
            publicKey: import.meta.env.IMAGEKIT_PUBLIC_KEY || "",
            privateKey: import.meta.env.IMAGEKIT_PRIVATE_KEY || "",
            urlEndpoint: import.meta.env.IMAGEKIT_ENDPOINT || "",
        });

        const list = await imagekit.listFiles({
            limit: 1000,
            sort: 'DESC_CREATED'
        });

        const filesByFolder: Record<string, ImageKitFile[]> = {};

        list.forEach((file: unknown) => {
            const fileObj = file as Record<string, unknown>;
            if (fileObj.filePath && fileObj.fileId && fileObj.url) {
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

                    // Generate all thumbnail sizes using the enhanced utility
                    const thumbnailSizes = getAllThumbnailSizes(fileObj.url as string, isVideo);

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
                        width: actualWidth,
                        height: actualHeight,
                        aspectRatio,
                        // Use optimized thumbnails with new parameters
                        thumbnailUrl: thumbnailSizes.medium,
                        thumbnailUrlSmall: thumbnailSizes.small,
                        thumbnailUrlLarge: thumbnailSizes.large,
                        fallbackUrl: fileObj.url as string,
                        duration: (fileObj.duration as number) || (isVideo ? 120 : undefined),
                        tags: (fileObj.tags as string[]) || undefined,
                        fileSize: (fileObj.size as number) || 0,
                        mimeType: (fileObj.mimeType as string) || (isVideo ? 'video/mp4' : 'image/jpeg')
                    };

                    filesByFolder[folder].push(enhancedFile);
                }
            }
        });

        // Sort files within each folder by creation date (newest first)
        Object.keys(filesByFolder).forEach(folder => {
            filesByFolder[folder].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        });

        return new Response(JSON.stringify(filesByFolder), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching files from ImageKit:', error);
        return new Response(JSON.stringify({ message: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
