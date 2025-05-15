interface PushoverMessage {
  title?: string;
  message: string;
  priority?: number; // -2 to 2, emergency requires retry & expire
  sound?: string;
  url?: string;
  url_title?: string;
  retry?: number; // Required for priority 2
  expire?: number; // Required for priority 2
  html?: number; // 1 for HTML formatting
}

interface PushoverResponse {
  status: number;
  request: string;
  errors?: string[];
}

// Pushover credentials from environment variables
const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN || '';
const PUSHOVER_USER = process.env.PUSHOVER_USER || '';

/**
 * Send a notification to Pushover service
 * @param message The message object to send
 * @returns Promise with success status and any errors
 */
export async function sendPushoverNotification(message: PushoverMessage): Promise<PushoverResponse | null> {
  // Skip if not configured in environment
  if (!PUSHOVER_TOKEN || !PUSHOVER_USER) {
    console.warn('Pushover is not configured. Skipping notification.');
    return null;
  }

  try {
    // Clean multiline messages
    const formattedMessage = message.message.replace(/\n/g, '\n');
    
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: PUSHOVER_TOKEN,
        user: PUSHOVER_USER,
        ...message,
        message: formattedMessage
      }),
    });
    
    const responseData = await response.json() as PushoverResponse;
    
    if (!response.ok) {
      console.error('Pushover notification failed:', responseData);
      return {
        status: response.status,
        request: responseData.request,
        errors: responseData.errors || [`HTTP Error: ${response.status}`]
      };
    }
    
    return responseData;
  } catch (error) {
    console.error('Error sending Pushover notification:', error);
    return {
      status: 0,
      request: '',
      errors: [(error as Error).message ? (error as Error).message : 'Unknown error']
    };
  }
}