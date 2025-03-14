import { ImageResponse } from '@vercel/og';
import { getPartners } from '@/data';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    // Get the origin from the request URL
    const url = new URL(req.url);
    const origin = url.origin;
    
    // Fetch partners data
    const partners = getPartners();
    
    // Convert relative URLs to absolute URLs
    const partnersWithAbsoluteUrls = partners.map(partner => ({
      ...partner,
      logo: partner.logo.startsWith('http') 
        ? partner.logo 
        : `${origin}${partner.logo}`
    }));
    

    console.log(partnersWithAbsoluteUrls);

    // Generate a random index for partner rotation
    // This will rotate partners on each generation instead of time-based rotation
    const totalGroups = Math.max(1, Math.ceil(partnersWithAbsoluteUrls.length / 6));
    const randomRotationIndex = Math.floor(Math.random() * totalGroups);
    
    // Get 5 partners for the current rotation (changed from 6)
    const startIndex = (randomRotationIndex * 5) % partnersWithAbsoluteUrls.length;
    let displayPartners = [];
    
    // Handle case where we need to wrap around the array
    if (startIndex + 5 <= partnersWithAbsoluteUrls.length) {
      displayPartners = partnersWithAbsoluteUrls.slice(startIndex, startIndex + 5);
    } else {
      const firstPart = partnersWithAbsoluteUrls.slice(startIndex);
      const remaining = 5 - firstPart.length;
      const secondPart = partnersWithAbsoluteUrls.slice(0, remaining);
      displayPartners = [...firstPart, ...secondPart];
    }
    
    // Ensure we have exactly 5 partners (or fewer if there are less than 5 total)
    displayPartners = displayPartners.slice(0, 5);
    
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
              ZurichJS Partners
            </h1>
            <p style={{ 
              fontSize: '24px',
              margin: '10px 0 0',
              color: '#333',
            }}>
              Organizations supporting our JavaScript community
            </p>
          </div>
          
          {/* Partners Grid - now with 5 partners and a CTA in the bottom middle */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '30px',
            flex: 1,
          }}>
            {/* First four partners */}
            {displayPartners.slice(0, 4).map((partner) => (
              <div key={partner.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '30%',
              }}>
                <img
                  src={partner.logo}
                  alt={partner.name}
                  width={160}
                  height={90}
                  style={{
                    objectFit: 'contain',
                  }}
                />
                <p style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '12px 0 0',
                  textAlign: 'center',
                }}>
                  {partner.name}
                </p>
              </div>
            ))}
            
            {/* CTA Card in the bottom middle position (5th card) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0F69AF',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              width: '30%',
            }}>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                textAlign: 'center',
              }}>
                Become a ZurichJS Partner Today!
              </p>
            </div>
            
            {/* Last partner */}
            {displayPartners.slice(4, 5).map((partner) => (
              <div key={partner.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                width: '30%',
              }}>
                <img
                  src={partner.logo}
                  alt={partner.name}
                  width={160}
                  height={90}
                  style={{
                    objectFit: 'contain',
                  }}
                />
                <p style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '12px 0 0',
                  textAlign: 'center',
                }}>
                  {partner.name}
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
