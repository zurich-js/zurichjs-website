import announcement from './announcement'
import comprehensiveFeedback from './comprehensiveFeedback'
import conference from './conference'
import event from './events'
import feedback from './feedback'
import meetupRating from './meetupRating'
import partner from './partner'
import siteSettings from './siteSettings'
import speaker from './speaker'
import stats from './stats'
import talk from './talk'
import talkSubmission from './talkSubmission'

/** One document each; the desk structure opens them directly and the actions below hide create/delete. */
export const SINGLETONS = ['meetupRating', 'conference', 'siteSettings'] as const

export const schemaTypes = [
  event,
  speaker,
  stats,
  partner,
  talk,
  talkSubmission,
  feedback,
  comprehensiveFeedback,
  announcement,
  meetupRating,
  conference,
  siteSettings,
]
