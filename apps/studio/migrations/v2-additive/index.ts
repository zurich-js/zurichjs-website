import {at, defineMigration, setIfMissing} from 'sanity/migrate'

/**
 * V2 additive migration (zurichjs-website docs/v2/CONTENT-MODEL-DIFF.md).
 * Only sets fields that are missing. Never deletes or overwrites anything.
 *
 *   npx sanity migration run v2-additive                 # dry run (default): prints the patches
 *   npx sanity migration run v2-additive --dataset v2-preview --no-dry-run
 *
 * Do not run with --no-dry-run against "production" without the owner's go-ahead.
 */
const parseAddress = (address?: string) => {
  if (!address) return {city: 'Zürich'}
  const m = address.match(/^(.*?),?\s*(\d{4})\s+([^,]+?)(?:,\s*Switzerland)?$/i)
  return m ? {street: m[1].replace(/,\s*$/, '').trim() || undefined, zip: m[2], city: m[3].trim()} : {street: address.trim(), city: 'Zürich'}
}

export default defineMigration({
  title: 'V2: default event status and structured venue',
  documentTypes: ['events'],
  migrate: {
    document(doc) {
      const venue = doc.venue as {name?: string} | undefined
      const needsVenue = !venue?.name && typeof doc.location === 'string' && doc.location.trim().length > 0
      return [
        at('status', setIfMissing('scheduled')),
        ...(needsVenue ? [at('venue', setIfMissing({name: (doc.location as string).trim(), ...parseAddress(doc.address as string | undefined)}))] : []),
      ]
    },
  },
})
