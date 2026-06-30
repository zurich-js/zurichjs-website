import { GetStaticPropsResult } from "next";

// The standalone /cfp/form page has been merged back into /cfp now that the
// conference CFP is closed and /cfp hosts the meetup form directly. Keep this
// route as a permanent redirect so existing links and bookmarks still work.
export default function CFPFormRedirect() {
  return null;
}

export function getStaticProps(): GetStaticPropsResult<Record<string, never>> {
  return {
    redirect: {
      destination: "/cfp",
      permanent: true,
    },
  };
}
