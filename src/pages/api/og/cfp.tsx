import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const emojis = ['👩‍💻', '👨‍💻', '🤓', '🧠', '💭', '📝', '🎤', '📸', , '🔍', '📊', '🚀', '✨', '🎯', '📱', '💻', '⚙️', '🔧', '🌐', '📈', '🧩'];

export default async function handler(req: NextRequest) {
  try {
    // Get query parameters with defaults
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Call for Papers';
    const event = searchParams.get('event') || 'ZurichJS';
    const deadline = searchParams.get('deadline') || 'Limited spots available!';
    
    // Randomly select emojis
    const randomEmojis = Array(4).fill(0).map(() => 
      emojis[Math.floor(Math.random() * emojis.length)]
    );
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFCA28',
            padding: 40,
            color: '#000',
          }}
        >
          <div style={{ display: 'flex', marginBottom: 20 }}>
            {randomEmojis.map((emoji, i) => (
              <div key={i} style={{ fontSize: 60, margin: '0 10px' }}>
                {emoji}
              </div>
            ))}
          </div>
          
          <div
            style={{
              fontSize: 60,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 20,
              color: '#000',
            }}
          >
            {title}
          </div>
          
          <div
            style={{
              fontSize: 40,
              textAlign: 'center',
              marginBottom: 30,
              color: '#333',
            }}
          >
            {event}
          </div>
          
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              borderRadius: 16,
              padding: '12px 24px',
              fontSize: 30,
              fontWeight: 'bold',
              marginBottom: 30,
              color: '#000',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            Don&apos;t miss out: {deadline}
          </div>
          
          <div
            style={{
              fontSize: 28,
              textAlign: 'center',
              color: '#333',
            }}
          >
            Share your expertise! Be part of something amazing! 🎤
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image: ${e}`, {
      status: 500,
    });
  }
}
