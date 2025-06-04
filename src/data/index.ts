export type PartnerType = 'venue' | 'conference' | 'community' | 'supporting';
export type SponsorshipTier = 'gold' | 'silver' | 'community' | 'other';

export interface Partner {
    id: string;
    name: string;
    logo: string;
    url: string;
    type: PartnerType;
    sponsorshipTier?: SponsorshipTier;
    description?: string;
    blurb?: string;
}

export const getPartners = () => {
    const partners: Partner[] = [
        // Venue Partners
        {
            id: '1',
            name: 'Ginetta',
            logo: '/images/partners/ginetta.png',
            url: 'https://ginetta.net',
            type: 'venue',
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '2',
            name: 'Novu AG',
            logo: '/images/partners/novu.png',
            url: 'https://novu.ch/',
            type: 'venue',
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '3',
            name: 'Get Your Guide',
            logo: '/images/partners/get-your-guide.png',
            url: 'https://www.gyg.com/',
            type: 'venue',
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '4',
            name: 'Smallpdf',
            logo: '/images/partners/smallpdf.png',
            url: 'https://smallpdf.com',
            type: 'venue',
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '14',
            name: 'Orbiz Josef Zurich',
            logo: '/images/partners/orbiz.png',
            url: 'https://orbiz-flex.ch/standort/josef',
            type: 'venue',
            description: 'Hosting venue for ZurichJS meetups'
        },

        // Conference Partners
        {
            id: '5',
            name: 'React Paris',
            logo: '/images/partners/react-paris.png',
            url: 'https://reactparis.com/',
            type: 'conference',
            description: 'Exclusive discounts for ZurichJS members'
        },
        {
            id: '12',
            name: 'dotJS',
            logo: '/images/partners/dotjs.png',
            url: 'https://www.dotjs.io/',
            type: 'conference',
            description: 'Exclusive discounts for ZurichJS members'
        },
        {
            id: '9',
            name: 'Voxxed Days Zurich',
            logo: '/images/partners/voxxed-days-zurich.png',
            url: 'https://zurich.voxxeddays.com/',
            type: 'conference',
            description: 'Exclusive discounts for ZurichJS members'
        },
        {
            id: '7',
            name: 'CityJS',
            logo: '/images/partners/city-js.png',
            url: 'https://cityjsconf.org/',
            type: 'conference',
            description: 'Exclusive discounts for ZurichJS members'
        },

        // Community Partners
        {
            id: '6',
            name: 'Code Blossom',
            logo: '/images/partners/code-blossom.png',
            url: 'https://www.code-blossom.com/',
            type: 'community',
            description: 'Regional JavaScript community partner'
        },
        {
            id: '8',
            name: 'Grusp',
            logo: '/images/partners/grusp.png',
            url: 'https://www.grusp.org/',
            type: 'conference',
            description: 'Regional JavaScript community partner'
        },
        {
            id: '10',
            name: 'Web Zurich',
            logo: '/images/partners/webzurich.png',
            url: 'https://webzurich.ch/',
            type: 'community',
            description: 'Regional web development community partner'
        },

        // Supporting Partners
        {
            id: '11',
            name: 'Swiss Dev Jobs',
            logo: '/images/partners/sdj-rectangle.png',
            url: 'https://swissdevjobs.ch/jobs/JavaScript/all',
            type: 'supporting',
            description: 'Job board access for ZurichJS members'
        },
        {
            id: '13',
            name: 'JetBrains',
            logo: '/images/partners/jetbrains.png',
            url: 'https://www.jetbrains.com/',
            type: 'supporting',
            description: 'Software licenses and tools for ZurichJS'
        },
        {
            id: '14',
            name: 'ImageKit',
            logo: '/images/partners/imagekit.png',
            url: 'https://imagekit.io?utm_source=zurichjs&utm_medium=website',
            type: 'supporting',
            sponsorshipTier: 'gold',
            description: 'Image and Video API plus AI-powered DAM',
            blurb: 'ImageKit is a complete media management solution that helps developers and businesses optimize, transform, and deliver images and videos through a global CDN. With powerful APIs, real-time transformations, and AI-powered digital asset management, ImageKit streamlines media workflows while improving web performance and user experience.'
        },
        {
            id: '15',
            name: 'GYFF',
            logo: '/images/partners/gyff.png',
            url: 'https://www.getyourfreefast.ch',
            type: 'supporting',
            sponsorshipTier: 'silver',
            description: 'Swiss platform connecting IT experts with businesses',
            blurb: 'GetYourFreeFast.ch (GYFF) is the Swiss platform that facilitates connections between IT experts and businesses.\n\n👉 IT professionals can find tailor-made assignments tailored to their skills and availability.\n\n👉 Businesses can access a selection of qualified and available IT experts, capable of quickly responding to their projects.\n\nOur goal: to simplify and accelerate networking in the Swiss IT world, while guaranteeing responsiveness and quality.'
        },
    ];

    return partners;
};

// Helper function to get partners by type
export const getPartnersByType = (type: PartnerType) => {
    return getPartners().filter(partner => partner.type === type);
};

// Helper function to get partners by sponsorship tier
export const getPartnersBySponsorshipTier = (tier: SponsorshipTier) => {
    return getPartners().filter(partner => partner.sponsorshipTier === tier);
};

// Helper function to get all partners with sponsorship tiers (excluding those without tiers)
export const getSponsorshipPartners = () => {
    return getPartners().filter(partner => partner.sponsorshipTier);
};

// Helper function to get partners without sponsorship tiers (regular partners)
export const getRegularPartners = () => {
    return getPartners().filter(partner => !partner.sponsorshipTier);
};