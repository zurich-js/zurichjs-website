import Head from 'next/head';
import { useRouter } from 'next/router';

interface OpenGraphProfile {
  firstName?: string;
  lastName?: string;
  username?: string;
}

interface OpenGraphData {
  title: string;
  description: string;
  type?: 'website' | 'article' | 'profile' | 'book';
  url?: string;
  image?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
  profile?: OpenGraphProfile;
}

interface TwitterData {
  cardType?: 'summary' | 'summary_large_image' | 'app' | 'player';
  handle?: string;
  site?: string;
}

interface MetaTag {
  name: string;
  content: string;
}

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  additionalMetaTags?: MetaTag[];
  noindex?: boolean;
}

const SEO = ({
  title,
  description,
  canonical,
  openGraph,
  twitter,
  additionalMetaTags,
  noindex = false,
}: SEOProps) => {
  const router = useRouter();
  const url = canonical || `https://zurichjs.com${router.asPath}`;
  
  // Default OG data if not provided
  const defaultOpenGraph: OpenGraphData = {
    title,
    description,
    type: 'website',
    url,
    image: '/logo-square.png', // Replace with your default OG image
  };

  const og = { ...defaultOpenGraph, ...openGraph };

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Robots meta tag */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={og.title} />
      <meta property="og:description" content={og.description} />
      <meta property="og:type" content={og.type || 'website'} />
      <meta property="og:url" content={og.url || url} />
      {og.image && <meta property="og:image" content={og.image} />}
      
      {/* Open Graph Article */}
      {og.type === 'article' && og.article && (
        <>
          {og.article.publishedTime && (
            <meta property="article:published_time" content={og.article.publishedTime} />
          )}
          {og.article.modifiedTime && (
            <meta property="article:modified_time" content={og.article.modifiedTime} />
          )}
          {og.article.authors?.map((author, index) => (
            <meta key={`article:author:${index}`} property="article:author" content={author} />
          ))}
          {og.article.tags?.map((tag, index) => (
            <meta key={`article:tag:${index}`} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Open Graph Profile */}
      {og.type === 'profile' && og.profile && (
        <>
          {og.profile.firstName && (
            <meta property="profile:first_name" content={og.profile.firstName} />
          )}
          {og.profile.lastName && (
            <meta property="profile:last_name" content={og.profile.lastName} />
          )}
          {og.profile.username && (
            <meta property="profile:username" content={og.profile.username} />
          )}
        </>
      )}
      
      {/* Twitter */}
      {twitter && (
        <>
          <meta name="twitter:card" content={twitter.cardType || 'summary'} />
          {twitter.handle && <meta name="twitter:creator" content={twitter.handle} />}
          <meta name="twitter:site" content={twitter.site || '@zurichjs'} />
          <meta name="twitter:title" content={og.title} />
          <meta name="twitter:description" content={og.description} />
          {og.image && <meta name="twitter:image" content={og.image} />}
        </>
      )}
      
      {/* Additional meta tags */}
      {additionalMetaTags?.map((tag) => (
        <meta key={tag.name} name={tag.name} content={tag.content} />
      ))}
    </Head>
  );
};

export default SEO; 