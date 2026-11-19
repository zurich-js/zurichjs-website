import { describe, expect, it } from 'vitest';
import { cleanSlug, isGeneratedId, planSpeakerIds } from '../lib/speakerIds';

const GENERATED = 'speaker-ce57073e-185e-4b8f-980b-bfa996270837';

describe('speaker IDs', () => {
  it('cleans an ID to lowercase letters, digits and single hyphens', () => {
    expect(cleanSlug(' Nicolò  Ribaudo_')).toBe('nicolo-ribaudo');
    expect(cleanSlug('Stéphane Turquay')).toBe('stephane-turquay');
    // Letters with no separate accent keep a readable spelling instead of leaving a gap.
    expect(cleanSlug('Jens Rømer Hesselbjerg')).toBe('jens-romer-hesselbjerg');
    expect(cleanSlug('Łukasz Nowak')).toBe('lukasz-nowak');
    expect(cleanSlug('Daniel Barrera Thümmler')).toBe('daniel-barrera-thummler');
    expect(cleanSlug('Jörg Weiß')).toBe('jorg-weiss');
  });

  it('knows the old site’s generated IDs from real ones', () => {
    expect(isGeneratedId(GENERATED)).toBe(true);
    expect(isGeneratedId('speaker-of-the-house')).toBe(false);
    expect(isGeneratedId('nadja-hesselbjerg')).toBe(false);
  });

  it('a generated ID becomes the speaker’s name, and the old ID is kept so its links keep working', () => {
    const [plan] = planSpeakerIds([{ _id: 'a', slug: GENERATED, name: 'Nadja Hesselbjerg', legacySlugs: ['nadja'] }]);
    expect(plan).toMatchObject({ kind: 'change', to: 'nadja-hesselbjerg', legacySlugs: ['nadja', GENERATED] });
  });

  it('leaves clean, name-based IDs alone and cleans the others', () => {
    const plans = planSpeakerIds([
      { _id: 'a', slug: 'faris-aziz', name: 'Faris Aziz' },
      { _id: 'b', slug: 'Bogdan_Ilie', name: 'Bogdan Mihai Ilie' },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ kind: 'change', to: 'bogdan-ilie', legacySlugs: ['Bogdan_Ilie'] });
  });

  it('never hands out an ID twice, nor one that is another speaker’s current or old ID', () => {
    const other = 'speaker-1f8c216d-ca40-444b-8e79-885da5318904';
    const plans = planSpeakerIds([
      { _id: 'a', slug: 'jan-nicklas', name: 'Jan Nicklas' },
      { _id: 'b', slug: GENERATED, name: 'Jan Nicklas' },
      { _id: 'c', slug: other, name: 'Max Muster' },
      { _id: 'd', slug: 'speaker-22242222-7291-4da7-a4c4-e61762cde94c', name: 'Max Muster' },
      { _id: 'e', slug: 'anna', name: 'Anna', legacySlugs: ['tomas-ferreras'] },
      { _id: 'f', slug: 'speaker-78e5397b-8d59-4001-b4be-612ba23de794', name: 'Tomas Ferreras' },
    ]);
    expect(plans.map((p) => [p.row._id, p.kind])).toEqual([
      ['b', 'problem'],
      ['c', 'change'],
      ['d', 'problem'],
      ['f', 'problem'],
    ]);
  });

  it('reports a generated ID with no name instead of inventing one', () => {
    expect(planSpeakerIds([{ _id: 'a', slug: GENERATED }])[0]).toMatchObject({ kind: 'problem' });
  });
});
