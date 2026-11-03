import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {readiness, type EventDraft} from '../lib/readiness'
import {previewUrlFor} from '../lib/preview'

/**
 * The event workspace checklist (V2 audit): template or duplicate, venue, programme,
 * Meetup handoff, preview, readiness, publish. Shows what the public page still needs.
 */
export function ReadinessView(props: {document: {displayed: EventDraft & {_id?: string}}}) {
  const doc = props.document.displayed
  const checks = readiness(doc)
  const missing = checks.filter((c) => !c.ok)
  const url = previewUrlFor(doc.id?.current)
  return (
    <Box padding={4}>
      <Stack gap={4}>
        <Card padding={4} radius={3} tone={missing.length ? 'caution' : 'positive'}>
          <Text weight="bold">{missing.length ? `${missing.length} thing${missing.length === 1 ? '' : 's'} missing before this page is ready` : 'Ready to publish'}</Text>
        </Card>
        <Stack gap={3}>
          {checks.map((c) => (
            <Card key={c.label} padding={3} radius={2} border>
              <Flex gap={3} align="flex-start">
                <Badge tone={c.ok ? 'positive' : 'caution'}>{c.ok ? 'Done' : 'Missing'}</Badge>
                <Stack gap={2}>
                  <Text weight="semibold">{c.label}</Text>
                  <Text size={1} muted>
                    {c.why}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          ))}
        </Stack>
        <Card padding={3} radius={2} tone="primary">
          <Stack gap={3}>
            <Text weight="semibold">Before you publish</Text>
            <Text size={1}>1. Start from the “Meetup” template or duplicate last month’s event.</Text>
            <Text size={1}>2. Venue tab: name, street, postcode. Programme tab: talks in running order.</Text>
            <Text size={1}>3. Create the event on Meetup and paste its link (Meetup and tickets tab).</Text>
            <Text size={1}>
              4. Preview the page{url ? ': ' : ' in the Presentation tool.'}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              )}
            </Text>
            <Text size={1}>5. When this list is all “Done”, publish. The site rebuilds within a few minutes.</Text>
          </Stack>
        </Card>
      </Stack>
    </Box>
  )
}
