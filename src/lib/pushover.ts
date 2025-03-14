interface PushoverMessage {
  title?: string;
  message: string;
  priority?: number;
  url?: string;
  url_title?: string;
}


// Pushover credentials from environment variables
const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN || '';
const PUSHOVER_USER = process.env.PUSHOVER_USER || '';

export async function sendPushoverNotification(message: PushoverMessage): Promise<void> {
  try {
    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: PUSHOVER_TOKEN,
        user: PUSHOVER_USER,
        ...message
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Pushover notification failed:', errorData);
    }
  } catch (error) {
    console.error('Error sending Pushover notification:', error);
  }
}