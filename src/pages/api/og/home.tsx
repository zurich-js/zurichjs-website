import { ImageResponse } from '@vercel/og'
import { getUpcomingEvents } from '@/sanity/queries'
import { getSpeakers } from '@/sanity/queries'
import { getPartners } from '@/data'

export const config = {
  runtime: 'edge',
}

export default async function handler() {
  try {

    
    // Fetch data
    const upcomingEvents = await getUpcomingEvents()
    const nextEvent = upcomingEvents[0]
    
    if (nextEvent) {
      // If there's an upcoming event, create OG image for it
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
              color: '#000000',
              padding: '40px',
              fontFamily: 'sans-serif',
            }}
          >
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
                ZurichJS
              </h1>
              <p style={{ 
                fontSize: '24px',
                margin: '10px 0 0',
                color: '#333',
              }}>
                JavaScript Community in Zurich
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80%',
                backgroundColor: 'white',
                color: '#000',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                Next Event: {nextEvent.title}
              </h2>
              <p
                style={{
                  fontSize: '24px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  color: '#333',
                }}
              >
                {new Date(nextEvent.datetime).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p
                style={{
                  fontSize: '20px',
                  marginBottom: '8px',
                  textAlign: 'center',
                  color: '#555',
                }}
              >
                {nextEvent.location}
              </p>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    } else {
      // If no upcoming event, show ZurichJS stats
      const speakers = await getSpeakers()
      const partners = await getPartners()
      
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
              color: '#000000',
              padding: '40px',
              fontFamily: 'sans-serif',
            }}
          >
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
                ZurichJS
              </h1>
              <p style={{ 
                fontSize: '24px',
                margin: '10px 0 0',
                color: '#333',
              }}>
                JavaScript Community in Zurich
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80%',
                backgroundColor: 'white',
                color: '#000',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '24px',
                  textAlign: 'center',
                  color: '#000',
                }}
              >
                Our Community
              </h2>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  width: '100%',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#333' }}>
                    {speakers.length}+
                  </p>
                  <p style={{ fontSize: '24px', color: '#555' }}>Speakers</p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#333' }}>
                    {partners.length}+
                  </p>
                  <p style={{ fontSize: '24px', color: '#555' }}>Partners</p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#333' }}>500+</p>
                  <p style={{ fontSize: '24px', color: '#555' }}>Community Members</p>
                </div>
              </div>
              <p
                style={{
                  fontSize: '24px',
                  textAlign: 'center',
                  color: '#333',
                }}
              >
                Join us for regular meetups, workshops, and events!
              </p>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
