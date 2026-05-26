import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo-square.png" />

        {/* Theme Color for Mobile Browsers */}
        <meta name="theme-color" content="#ECDC30" />

        {/* Self-hosted font preload (critical — body font) */}
        <link
          rel="preload"
          href="/fonts/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/* Preconnect to External Domains for Performance */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://cdn.sanity.io" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />

        {/* Inspectlet — deferred to avoid blocking render */}
        <Script
          id="inspectlet"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              window.__insp = window.__insp || [];
              __insp.push(['wid', 1327741264]);
              var ldinsp = function(){
                if(typeof window.__inspld != "undefined") return; window.__inspld = 1; var insp = document.createElement('script'); insp.type = 'text/javascript'; insp.async = true; insp.id = "inspsync"; insp.src = ('https:' == document.location.protocol ? 'https' : 'http') + '://cdn.inspectlet.com/inspectlet.js?wid=1327741264&r=' + Math.floor(new Date().getTime()/3600000); var x = document.getElementsByTagName('script')[0]; x.parentNode.insertBefore(insp, x); };
              setTimeout(ldinsp, 0);
            })();
            `,
          }}
        />

        {/* LinkedIn Insight Tag — deferred to avoid blocking render */}
        <Script
          id="linkedin-partner"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
            _linkedin_partner_id = "7172098";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            (function(l) {
              if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);})(window.lintrk);
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src="https://px.ads.linkedin.com/collect/?pid=7172098&fmt=gif"
          />
        </noscript>
      </body>
    </Html>
  );
}
