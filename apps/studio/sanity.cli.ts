import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'viqjrovw',
    dataset: 'production',
  },
  deployment: {
    // The deployed Studio (sanity.io/manage › Studios). Lets CI deploy without prompts.
    appId: 'rtqvy1wtijjry3fofeac56rv',
    // Patch and minor releases reach editors without a redeploy.
    autoUpdates: true,
  },
})
