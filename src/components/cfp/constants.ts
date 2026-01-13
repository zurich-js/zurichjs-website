export const STORAGE_KEY = 'zurichjs-cfp-form';
export const CONFERENCE_CFP_URL = 'https://conf.zurichjs.com/cfp';

export const TALK_TOPICS = [
  'JavaScript Fundamentals',
  'React',
  'Angular',
  'Vue',
  'Svelte',
  'Node.js',
  'TypeScript',
  'Testing',
  'Web Performance',
  'JavaScript Frameworks',
  'Frontend Development',
  'Backend Development',
  'Web3',
  'AI in JavaScript',
  'Tooling',
  'DevOps',
  'Monetization',
  'Growth Hacking',
  'Product Management',
  'User Experience',
  'Analytics & Metrics',
  'A/B Testing',
  'Conversion Optimization',
  'Business Strategy',
  'Startup Journey',
  'Team Leadership',
  'Remote Work',
  'Career Development',
] as const;

export type TalkTopic = (typeof TALK_TOPICS)[number];
