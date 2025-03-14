import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  try {
    // Get the origin from the request URL
    const url = new URL(req.url);
    const origin = url.origin;
    
    // Create absolute URLs for team member images
    const farisImageUrl = `${origin}/images/team/faris.jpg`;
    const bogdanImageUrl = `${origin}/images/team/bogdan.jpg`;

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
            backgroundColor: '#FFFFFF',
            backgroundImage: 'linear-gradient(to bottom right, #FBBF24, #F59E0B)',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0',
                textAlign: 'center',
              }}
            >
              Get in Touch with ZurichJS
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: '#111827',
                marginTop: '10px',
                textAlign: 'center',
                maxWidth: '800px',
              }}
            >
              Connect with our JavaScript community in Zurich
            </p>
          </div>

          {/* Team members */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'center',
              gap: '40px',
            }}
          >
            {/* Faris */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
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
                  border: '4px solid #1D4ED8',
                  display: 'flex',
                }}
              >
                <img
                  src={farisImageUrl}
                  alt="Faris Aziz"
                  width={180}
                  height={180}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: '0',
                  marginBottom: '4px',
                }}
              >
                Faris Aziz
              </h2>
              <p
                style={{
                  fontSize: '20px',
                  color: '#1D4ED8',
                  margin: '0',
                  marginBottom: '16px',
                }}
              >
                Founder & Lead Organizer
              </p>
              <p
                style={{
                  fontSize: '18px',
                  color: '#4B5563',
                  margin: '0',
                  textAlign: 'center',
                }}
              >
                faris@zurichjs.com
              </p>
            </div>

            {/* Bogdan */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
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
                  border: '4px solid #1D4ED8',
                  display: 'flex',
                }}
              >
                <img
                  src={bogdanImageUrl}
                  alt="Bogdan Mihai Ilie"
                  width={180}
                  height={180}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#111827',
                  margin: '0',
                  marginBottom: '4px',
                }}
              >
                Bogdan Mihai Ilie
              </h2>
              <p
                style={{
                  fontSize: '20px',
                  color: '#1D4ED8',
                  margin: '0',
                  marginBottom: '16px',
                }}
              >
                Founder & Lead Organizer
              </p>
              <p
                style={{
                  fontSize: '18px',
                  color: '#4B5563',
                  margin: '0',
                  textAlign: 'center',
                }}
              >
                bogdan@zurichjs.com
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '40px',
              backgroundColor: '#1D4ED8',
              borderRadius: '8px',
              padding: '12px 24px',
            }}
          >
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                margin: '0',
              }}
            >
              hello@zurichjs.com | meetup.com/zurich-js
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
