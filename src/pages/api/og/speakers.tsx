import { ImageResponse } from '@vercel/og';
import { getSpeakers } from '@/sanity/queries';

export const config = {
  runtime: 'nodejs',
};

export default async function handler() {
  try {
    // Fetch speakers data
    const speakers = await getSpeakers();
    
    // Limit to a reasonable number for the grid
    const displaySpeakers = speakers.slice(0, 6);
    
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            backgroundColor: '#FFCA28',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '30px',
          }}>
            <h1 style={{ 
              fontSize: '60px', 
              fontWeight: 'bold',
              margin: '0',
              color: '#000',
            }}>
              ZurichJS Speakers
            </h1>
            <p style={{ 
              fontSize: '24px',
              margin: '10px 0 0',
              color: '#333',
            }}>
              Meet our amazing JavaScript community
            </p>
          </div>
          {/* Speaker Grid */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            flex: 1,
          }}>
            {displaySpeakers.map((speaker) => (
              <div key={speaker.id || speaker.name} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '30%',
              }}>
                {speaker.image ? (
                  <img
                    src={speaker.image}
                    alt={speaker.name}
                    width={120}
                    height={120}
                    style={{
                      borderRadius: '60px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '60px',
                    backgroundColor: '#E0E0E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    color: '#757575',
                  }}>
                    {speaker.name?.charAt(0) || '?'}
                  </div>
                )}
                <p style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '8px 0 0',
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {speaker.name || 'Speaker'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
} 