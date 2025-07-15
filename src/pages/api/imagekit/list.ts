import ImageKit from "imagekit";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const imagekit = new ImageKit({
        publicKey : process.env.IMAGEKIT_PUBLIC_KEY || "",
        privateKey : process.env.IMAGEKIT_PRIVATE_KEY || "",
        urlEndpoint : process.env.IMAGEKIT_ENDPOINT || "",
    });

    const list = await imagekit.listFiles({});
    
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
                filesByFolder[folder].push(file);
            }
        }
    });

    return res.status(200).json(filesByFolder);
}