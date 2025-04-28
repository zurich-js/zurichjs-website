export type PartnerType = 'venue' | 'conference' | 'community' | 'supporting';

export interface Partner {
    id: string;
    name: string;
    logo: string;
    url: string;
    type: PartnerType;
    description?: string;
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
        }
    ];

    return partners;
};

// Helper function to get partners by type
export const getPartnersByType = (type: PartnerType) => {
    return getPartners().filter(partner => partner.type === type);
};