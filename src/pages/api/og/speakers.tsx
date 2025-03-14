import { ImageResponse } from '@vercel/og';
import { getSpeakers } from '@/sanity/queries';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  console.log('Starting OG image generation for speakers');
  try {
    // Fetch speakers data
    console.log('Fetching speakers data');
    const speakers = await getSpeakers();
    console.log(`Fetched ${speakers.length} speakers`);
    
    // Limit to a reasonable number for the grid
    const displaySpeakers = speakers.slice(0, 6);
    console.log(`Using ${displaySpeakers.length} speakers for display`);
    
    // Log speaker data for debugging
    displaySpeakers.forEach((speaker, index) => {
      console.log(`Speaker ${index + 1}: ${speaker.name || 'Unknown'}, Image: ${speaker.image ? 'Yes' : 'No'}`);
    });
    
    console.log('Generating image response');
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
                    src="https://cdn.sanity.io/images/viqjrovw/production/a8f4c06973e34c942c9c73ed6a62bb4055bb6816-1280x1865.png"
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
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return new Response(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
} 