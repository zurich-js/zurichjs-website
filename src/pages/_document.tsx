import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Begin Inspectlet Asynchronous Code */}
        <script
          type="text/javascript"
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
        {/* End Inspectlet Asynchronous Code */}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
