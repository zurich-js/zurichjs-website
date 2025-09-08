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
    const workshopId = searchParams.get('workshopId') || '';
    
    // Get the origin from the request URL
    const url = new URL(req.url);
    const origin = url.origin;
    
    // Create absolute URL for speaker image if it's not already absolute
    const absoluteSpeakerImage = speakerImage.startsWith('http') 
      ? speakerImage 
      : speakerImage.startsWith('/') 
        ? `${origin}${speakerImage}` 
        : speakerImage;

    // Add cache-busting parameter based on content
    const contentHash = Buffer.from(`${title}-${subtitle}-${speakerName}-${workshopId}`).toString('base64').slice(0, 8);

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
            background: 'linear-gradient(135deg, #F1E271 0%, #EDC936 100%)',
            padding: '40px',
            color: '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '24px',
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: '48px',
                fontWeight: '900',
                margin: '0',
                textAlign: 'center',
                color: '#000000',
                textShadow: '0 2px 4px rgba(255, 255, 255, 0.5)',
                letterSpacing: '-1px',
                lineHeight: '1.1',
              }}
            >
              {title}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '12px',
                backgroundColor: '#258BCC',
                padding: '8px 20px',
                borderRadius: '50px',
                border: '2px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <p
                style={{
                  fontSize: '24px',
                  color: '#ffffff',
                  margin: '0',
                  textAlign: 'center',
                  fontWeight: '700',
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              maxWidth: '1080px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(20px)',
              border: '2px solid #258BCC',
              zIndex: 1,
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
                    background: '#258BCC',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '25px',
                    fontSize: '18px',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(37, 139, 204, 0.4)',
                  }}
                >
                  🚀 ZurichJS Workshop
                </div>
              </div>
              
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  margin: '0 0 12px 0',
                  color: '#1a202c',
                  lineHeight: '1.2',
                }}
              >
                Learn practical skills with hands-on exercises
              </h2>
              
              <p
                style={{
                  fontSize: '20px',
                  color: '#4a5568',
                  margin: '0 0 20px 0',
                  lineHeight: '1.4',
                  fontWeight: '500',
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
                    background: '#258BCC',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '20px',
                    fontWeight: '700',
                    boxShadow: '0 6px 12px rgba(37, 139, 204, 0.4)',
                  }}
                >
                  ⚡ Limited Seats Available!
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
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
                border: '2px solid #258BCC',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  border: '3px solid #258BCC',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 6px 12px rgba(37, 139, 204, 0.3)',
                }}
              >
                {speakerImage && absoluteSpeakerImage ? (
                  <img
                    src={absoluteSpeakerImage.includes('?') ? absoluteSpeakerImage : `${absoluteSpeakerImage}?h=200&w=200&v=${contentHash}`}
                    alt={speakerName}
                    width={100}
                    height={100}
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
                      background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                        fontSize: '40px',
                        color: '#258BCC',
                        fontWeight: '700',
                    }}
                  >
                    {speakerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3
                style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  textAlign: 'center',
                  color: '#1a202c',
                }}
              >
                {speakerName}
              </h3>
              <p
                style={{
                  fontSize: '16px',
                  margin: '0',
                  textAlign: 'center',
                  color: '#258BCC',
                  fontWeight: '600',
                }}
              >
                Workshop Instructor
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '24px',
              fontSize: '22px',
              color: '#000000',
              fontWeight: '700',
              textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)',
              zIndex: 1,
            }}
          >
            🌐 zurichjs.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': 'image/png',
        },
      }
    );
  } catch (e) {

    
    // Return a fallback error image
    return new Response(
      `Failed to generate OG image for workshop. Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
} 