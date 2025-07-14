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

    console.log(list);

    return res.status(200).json(list);
}