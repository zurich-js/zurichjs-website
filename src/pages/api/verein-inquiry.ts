import type { NextApiRequest, NextApiResponse } from 'next';

import { sendPlatformNotification } from '@/lib/notification';

type ResponseData = {
  success: boolean;
  message: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { name, email, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    await sendPlatformNotification({
      title: `New Verein Membership Inquiry`,
      message: `Name: ${name}\nEmail: ${email}\nMessage: ${message || 'No message provided'}`,
      priority: 0
    });

    return res.status(200).json({
      success: true,
      message: 'Verein inquiry submitted successfully'
    });
  } catch (error) {
    console.error('Verein inquiry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit inquiry'
    });
  }
}

export default handler;
