# Publish webhook → site rebuild

The site is static, so publishing in the Studio triggers a Netlify build through a signed webhook to `https://zurichjs.com/api/rebuild`. Its settings (an owner action in sanity.io/manage) are in [the Studio concept](../../docs/systems/studio.md), "The publish webhook"; how publishes are debounced into builds is in [Rebuilds](../../docs/systems/operations/rebuilds.md).
