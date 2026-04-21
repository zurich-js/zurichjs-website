export enum PartnerType {
    Venue = 'venue',
    Conference = 'conference',
    Community = 'community',
    Supporting = 'supporting'
}

export enum SponsorshipTier {
    Champion = 'champion',
    Builder = 'builder',
    Friend = 'friend',
    Supporter = 'supporter',
    Other = 'other'
}

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
            type: PartnerType.Venue,
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '2',
            name: 'novu AG',
            logo: '/images/partners/novu.png',
            url: 'https://novu.ch/',
            type: PartnerType.Venue,
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '3',
            name: 'Get Your Guide',
            logo: '/images/partners/get-your-guide.png',
            url: 'https://qrco.de/bgTBWh',
            type: PartnerType.Venue,
            description: 'Software company hosting us for Vue Zurich/ZurichJS meetups'
        },
        {
            id: '4',
            name: 'Smallpdf',
            logo: '/images/partners/smallpdf.png',
            url: 'https://smallpdf.com',
            type: PartnerType.Venue,
            description: 'Hosting venue for ZurichJS meetups'
        },
        {
            id: '14',
            name: 'Orbiz Josef Zurich',
            logo: '/images/partners/orbiz.png',
            url: 'https://orbiz-flex.ch/standort/josef',
            type: PartnerType.Venue,
            description: 'Hosting venue for ZurichJS meetups'
        },

        // Conference Partners
        {
            id: '5',
            name: 'WhatTheStack',
            logo: '/images/partners/wts.png',
            url: 'https://wts.sh',
            type: PartnerType.Conference,
            description: 'Exclusive perks for ZurichJS members'
        },
        {
            id: '7',
            name: 'CityJS',
            logo: '/images/partners/city-js.png',
            url: 'https://cityjsconf.org/',
            type: PartnerType.Conference,
            description: 'Exclusive perks for ZurichJS members'
        },
        {
            id: '17',
            name: 'iJS Munich',
            logo: '/images/partners/ijs-munich.jpg',
            url: 'https://javascript-conference.com/munich/',
            type: PartnerType.Conference,
            description: 'The Conference for Fullstack JS Development',
            blurb: 'iJS gathers like-minded professionals to learn, share, and grow. Join us in Munich where industry leaders and innovators will come together to exchange insights, share experiences, and chart the course for the future of Javascript'
        },

        // Community Partners
        {
            id: '6',
            name: 'Code Blossom',
            logo: '/images/partners/code-blossom.png',
            url: 'https://www.code-blossom.com/',
            type: PartnerType.Community,
            description: 'Regional JavaScript community partner'
        },
        {
            id: '8',
            name: 'Grusp',
            logo: '/images/partners/grusp.png',
            url: 'https://www.grusp.org/',
            type: PartnerType.Conference,
            description: 'Regional JavaScript community partner'
        },
        {
            id: '10',
            name: 'Web Zurich',
            logo: '/images/partners/webzurich.png',
            url: 'https://webzurich.ch/',
            type: PartnerType.Community,
            description: 'Regional web development community partner'
        },

        // Supporting Partners
        {
            id: '11',
            name: 'Swiss Dev Jobs',
            logo: '/images/partners/sdj-rectangle.png',
            url: 'https://swissdevjobs.ch/jobs/JavaScript/all',
            type: PartnerType.Supporting,
            description: 'Job board access for ZurichJS members'
        },
        {
            id: '13',
            name: 'JetBrains',
            logo: '/images/partners/jetbrains.png',
            url: 'https://www.jetbrains.com/',
            type: PartnerType.Supporting,
            description: 'Software licenses and tools for ZurichJS'
        },
        {
            id: '15',
            name: 'GYFF',
            logo: '/images/partners/gyff.png',
            url: 'https://www.getyourfreefast.ch',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Supporter,
            description: 'Swiss platform connecting IT experts with businesses',
            blurb: 'GetYourFreeFast.ch (GYFF) is the Swiss platform that facilitates connections between IT experts and businesses.\n\n👉 IT professionals can find tailor-made assignments tailored to their skills and availability.\n\n👉 Businesses can access a selection of qualified and available IT experts, capable of quickly responding to their projects.\n\nOur goal: to simplify and accelerate networking in the Swiss IT world, while guaranteeing responsiveness and quality.'
        },
        {
            id: '18',
            name: 'Sentry',
            logo: '/images/partners/sentry.png',
            url: 'https://sentry.io/welcome',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Friend,
            description: 'Application monitoring and error tracking platform',
            blurb: 'Sentry helps every developer detect, understand, and fix broken code, fast. Using Sentry\'s debugging platform–that favors action over dashboards–decreases resolution time from days to minutes, resulting in freed up dev cycles and happier customers. Founded in 2008 by David Cramer and Chris Jennings as an Open Source side project, Sentry is used by over 4 million developers and 100,000 organizations, including Disney, Cloudflare, GitHub, Slack, Instacart, Atlassian, and Riot Games.'
        },
        {
            id: '19',
            name: 'Stripe',
            logo: '/images/partners/stripe.png',
            url: 'https://stripe.com',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Builder,
            description: 'Financial infrastructure for the internet',
            blurb: 'Stripe is a financial infrastructure platform for businesses. Millions of companies use Stripe to accept payments, grow revenue, and accelerate new business opportunities.'
        },
        {
            id: '20',
            name: 'Supabase',
            logo: '/images/partners/supabase.png',
            url: 'https://supabase.com',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Builder,
            description: 'The open source Firebase alternative',
            blurb: 'Supabase is an open source Firebase alternative. Start your project with a Postgres database, Authentication, instant APIs, Edge Functions, Realtime subscriptions, Storage, and Vector embeddings.'
        },
        {
            id: '21',
            name: 'Remotion',
            logo: '/images/partners/remotion.png',
            url: 'https://remotion.dev',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Friend,
            description: 'Make videos programmatically with React',
            blurb: 'Remotion is a framework for creating videos programmatically using React. Write video templates in React, render them using Node.js or in the cloud.'
        },
        {
            id: '22',
            name: 'Vercel',
            logo: '/images/partners/vercel-black.png',
            url: 'https://vercel.com',
            type: PartnerType.Supporting,
            sponsorshipTier: SponsorshipTier.Champion,
            description: 'The AI Cloud for building and deploying modern web applications',
            blurb: 'Vercel is a unified platform to build, deploy, and scale web applications, from static sites and full-stack apps to AI-powered experiences.'
        }
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

export type TodaySponsor = Omit<Partner, 'type'>;

export const getTodaysSponsors = (): TodaySponsor[] => {
    // Get existing partners for sponsors that are already in our system
    const allPartners = getPartners();
    const stripe = allPartners.find(p => p.name.toLowerCase() === 'stripe');
    const gyff = allPartners.find(p => p.name.toLowerCase() === 'gyff');
    const smallpdf = allPartners.find(p => p.name.toLowerCase() === 'smallpdf');

    const sponsors: TodaySponsor[] = [
        // Community Builder sponsorshipTier (Gold sponsor)
        ...(stripe ? [{
            id: stripe.id,
            name: stripe.name,
            logo: stripe.logo,
            url: stripe.url,
            sponsorshipTier: SponsorshipTier.Builder,
            description: stripe.description
        }] : []),

        ...(smallpdf ? [{
            id: smallpdf.id,
            name: smallpdf.name,
            logo: smallpdf.logo,
            url: smallpdf.url,
            sponsorshipTier: SponsorshipTier.Champion,
            description: smallpdf.description
        }] : []),

        // Community Supporter sponsorshipTier
        ...(gyff ? [{
            id: gyff.id,
            name: gyff.name,
            logo: gyff.logo,
            url: gyff.url,
            sponsorshipTier: SponsorshipTier.Supporter,
            description: gyff.description
        }] : [])
    ];

    // Sort by sponsorshipTier (champion first, then builder, friend, supporter)
    return sponsors.sort((a, b) => {
        const sponsorshipTierOrder = { champion: 0, builder: 1, friend: 2, supporter: 3 };
        const sponsorshipTierA = sponsorshipTierOrder[a.sponsorshipTier as keyof typeof sponsorshipTierOrder] ?? 4;
        const sponsorshipTierB = sponsorshipTierOrder[b.sponsorshipTier as keyof typeof sponsorshipTierOrder] ?? 4;
        return sponsorshipTierA - sponsorshipTierB;
    });
};
