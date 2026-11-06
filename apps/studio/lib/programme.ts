/**
 * The usual ZurichJS evening, as the old website estimated it
 * (zurichjs-website origin/main: src/components/today/ScheduleCard.tsx):
 * doors, welcome at 18:30, first talk at 18:50, each talk its own length
 * (20 min when unknown), a 15-minute break after the second talk when more
 * follow, 5 minutes between other talks, then networking.
 *
 * Organisers use it as a starting point ("Fill programme from talks") and
 * edit the times. The website itself never guesses times: it shows what the
 * agenda says, or the talks without times.
 */
export interface TalkForProgramme {
  _id: string
  title?: string
  durationMinutes?: number
}

export interface AgendaItemDraft {
  _key: string
  _type: 'agendaItem'
  time: string
  kind: 'doors' | 'intro' | 'talk' | 'break' | 'networking'
  title?: string
  talk?: {_type: 'reference'; _ref: string}
}

export interface ProgrammeIssue {
  message: string
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Doors in Zurich local time, "HH:MM". */
export const zurichTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

export function programmeFromTalks(
  doorsIso: string | undefined,
  talks: TalkForProgramme[],
  key: (i: number) => string = (i) => `p${i}`,
): {agenda: AgendaItemDraft[]; issues: ProgrammeIssue[]} {
  const issues: ProgrammeIssue[] = []
  const agenda: AgendaItemDraft[] = []
  let k = 0
  const push = (item: Omit<AgendaItemDraft, '_key' | '_type'>) =>
    agenda.push({_key: key(k++), _type: 'agendaItem', ...item})

  const intro = 18 * 60 + 30
  if (doorsIso) {
    const doors = zurichTime(doorsIso)
    const [h, m] = doors.split(':').map(Number)
    if (h * 60 + m >= intro)
      issues.push({
        message: `Doors (${doors}) are not before the usual 18:30 welcome; check the times.`,
      })
    push({time: doors, kind: 'doors', title: 'Doors open'})
  } else {
    issues.push({message: 'No doors time on the event.'})
  }
  push({time: hhmm(intro), kind: 'intro', title: 'Welcome and intro'})

  let t = 18 * 60 + 50
  talks.forEach((talk, i) => {
    if (!talk.durationMinutes)
      issues.push({message: `"${talk.title ?? talk._id}" has no duration; 20 minutes assumed.`})
    const d = talk.durationMinutes || 20
    push({time: hhmm(t), kind: 'talk', talk: {_type: 'reference', _ref: talk._id}})
    t += d
    if (i === 1 && i < talks.length - 1) {
      push({time: hhmm(t), kind: 'break', title: 'Break'})
      t += 15
    } else if (i < talks.length - 1) {
      t += 5
    }
  })
  if (!talks.length) issues.push({message: 'No talks on the event.'})
  t += 5
  if (t > 21 * 60 + 30)
    issues.push({message: `The talks run until ${hhmm(t)}, past the usual 21:30 end.`})
  push({time: hhmm(t), kind: 'networking', title: 'Networking and drinks'})
  return {agenda, issues}
}
