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

interface GeoData {
  region?: string;
  placename?: string;
  position?: string;
}

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  additionalMetaTags?: MetaTag[];
  noindex?: boolean;
  keywords?: string[];
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  geo?: GeoData;
}

const SEO = ({
  title,
  description,
  canonical,
  openGraph,
  twitter,
  additionalMetaTags,
  noindex = false,
  keywords = [],
  structuredData,
  geo,
}: SEOProps) => {
  const router = useRouter();
  const url = canonical || `https://zurichjs.com${router.asPath}`;

  // Default OG data if not provided
  const defaultOpenGraph: OpenGraphData = {
    title,
    description,
    type: 'website',
    url,
    image: 'https://zurichjs.com/logo-square.png',
  };

  const og = { ...defaultOpenGraph, ...openGraph };

  // Default Twitter config
  const defaultTwitter: TwitterData = {
    cardType: 'summary_large_image',
    site: '@zurichjs',
  };

  const tw = { ...defaultTwitter, ...twitter };

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Language */}
      <meta httpEquiv="content-language" content="en" />
      <meta property="og:locale" content="en_US" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonical || url} />

      {/* Robots meta tag */}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}

      {/* Geographic targeting */}
      {geo && (
        <>
          {geo.region && <meta name="geo.region" content={geo.region} />}
          {geo.placename && <meta name="geo.placename" content={geo.placename} />}
          {geo.position && <meta name="geo.position" content={geo.position} />}
          <meta name="ICBM" content={geo.position || '47.3769,8.5417'} />
        </>
      )}

      {/* Open Graph */}
      <meta property="og:site_name" content="ZurichJS" />
      <meta property="og:title" content={og.title} />
      <meta property="og:description" content={og.description} />
      <meta property="og:type" content={og.type || 'website'} />
      <meta property="og:url" content={og.url || url} />
      {og.image && (
        <>
          <meta property="og:image" content={og.image} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={title} />
        </>
      )}

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
      <meta name="twitter:card" content={tw.cardType || 'summary_large_image'} />
      <meta name="twitter:site" content={tw.site || '@zurichjs'} />
      {tw.handle && <meta name="twitter:creator" content={tw.handle} />}
      <meta name="twitter:title" content={og.title} />
      <meta name="twitter:description" content={og.description} />
      {og.image && <meta name="twitter:image" content={og.image} />}

      {/* Additional meta tags */}
      {additionalMetaTags?.map((tag) => (
        <meta key={tag.name} name={tag.name} content={tag.content} />
      ))}

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              Array.isArray(structuredData) ? structuredData : structuredData
            ),
          }}
        />
      )}
    </Head>
  );
};

export default SEO; 