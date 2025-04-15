import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  try {
    // Get query parameters with defaults
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'JavaScript Workshop';
    const subtitle = searchParams.get('subtitle') || 'ZurichJS';
    const speakerName = searchParams.get('speakerName') || 'Workshop Instructor';
    const speakerImage = searchParams.get('speakerImage') || '';
    
    // Get the origin from the request URL
    const url = new URL(req.url);
    const origin = url.origin;
    
    // Create absolute URL for speaker image if it's not already absolute
    const absoluteSpeakerImage = speakerImage.startsWith('http') 
      ? speakerImage 
      : `${origin}${speakerImage}`;

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
            backgroundImage: 'linear-gradient(to bottom right, #FFCA28, #F59E0B)',
            padding: '40px',
            color: '#000000',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                margin: '0',
                textAlign: 'center',
                color: '#000000',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: '#333333',
                marginTop: '10px',
                textAlign: 'center',
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              width: '90%',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Workshop Info */}
            <div
              style={{
                flex: '2',
                paddingRight: '32px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#000000',
                    color: '#FFCA28',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  ZurichJS Workshop
                </div>
              </div>
              
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0',
                  color: '#000000',
                }}
              >
                Learn practical skills with hands-on exercises
              </h2>
              
              <p
                style={{
                  fontSize: '24px',
                  color: '#333333',
                  margin: '0 0 24px 0',
                }}
              >
                Join our interactive workshop to enhance your JavaScript knowledge and connect with the community.
              </p>
              
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFCA28',
                    color: '#000000',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                  }}
                >
                  Limited Seats Available!
                </div>
              </div>
            </div>

            {/* Speaker Info */}
            <div
              style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '90px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  border: '4px solid #FFCA28',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {speakerImage ? (
                  <img
                    src={`${absoluteSpeakerImage}?h=150`}
                    alt={speakerName}
                    width={180}
                    height={180}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#E0E0E0',
                      fontSize: '72px',
                      color: '#757575',
                    }}
                  >
                    {speakerName.charAt(0)}
                  </div>
                )}
              </div>
              <h3
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  textAlign: 'center',
                  color: '#000000',
                }}
              >
                {speakerName}
              </h3>
              <p
                style={{
                  fontSize: '20px',
                  margin: '0',
                  textAlign: 'center',
                  color: '#555555',
                }}
              >
                Workshop Instructor
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '30px',
              fontSize: '24px',
              color: '#333333',
            }}
          >
            zurichjs.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('Error generating workshop OG image:', e);
    return new Response(`Failed to generate image: ${e instanceof Error ? e.message : 'Unknown error'}`, {
      status: 500,
    });
  }
} 