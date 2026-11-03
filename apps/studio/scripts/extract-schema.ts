/**
 * Offline schema extraction for `sanity typegen` (same output as `sanity schema extract`,
 * without contacting the Sanity API). Run: npx tsx scripts/extract-schema.ts
 */
import {writeFileSync} from 'node:fs'
import {extractSchema} from '@sanity/schema/_internal'
import {createSchema} from 'sanity'
import {schemaTypes} from '../schemaTypes'

const schema = createSchema({name: 'default', types: schemaTypes})
writeFileSync('schema.json', JSON.stringify(extractSchema(schema, {enforceRequiredFields: true}), null, 2) + '\n')
console.log('schema.json written')
