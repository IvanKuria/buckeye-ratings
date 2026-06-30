import { describe, it, expect } from 'vitest';
import { selectBestRmpMatch } from './rmpCache';
import { SUBJECT_DEPARTMENT_KEYWORDS } from './subjectDepartments';
import { OSU_SCHOOL_ID } from '@/lib/constants';
import type { RmpEdge } from '@/types';

/**
 * Builds a minimal RMP edge. Only the fields selectBestRmpMatch reads are
 * populated; the rest are filled with harmless defaults.
 */
function edge(
  firstName: string,
  lastName: string,
  department: string,
  numRatings: number
): RmpEdge {
  return {
    node: {
      id: `${firstName}-${lastName}-${department}`,
      legacyId: 0,
      firstName,
      lastName,
      avgRatingRounded: 4,
      numRatings,
      wouldTakeAgainPercentRounded: null,
      wouldTakeAgainCount: 0,
      teacherRatingTags: [],
      avgDifficultyRounded: 3,
      school: { name: 'The Ohio State University', id: OSU_SCHOOL_ID },
      department,
    },
  };
}

describe('selectBestRmpMatch — department-aware disambiguation', () => {
  it('picks the subject-matching namesake over a more-reviewed one in another department', () => {
    // The reported SOCIOL 4629 / Bethany Everett bug: a heavily-reviewed
    // Mathematics namesake currently wins the numRatings tiebreaker.
    const edges = [
      edge('Bethany', 'Everett', 'Mathematics', 80),
      edge('Bethany', 'Everett', 'Sociology', 4),
    ];
    const match = selectBestRmpMatch(edges, 'Bethany Everett', {
      subject: 'SOCIOL',
    });
    expect(match?.department).toBe('Sociology');
  });

  it('suppresses the match when same-name candidates collide and none fit the subject', () => {
    // SOCIOL 3549 / Chelsea Chen: only Physics + Math Chens exist on RMP.
    const edges = [
      edge('Chelsea', 'Chen', 'Physics', 30),
      edge('Chelsea', 'Chen', 'Mathematics', 12),
    ];
    const match = selectBestRmpMatch(edges, 'Chelsea Chen', {
      subject: 'SOCIOL',
    });
    expect(match).toBeNull();
  });

  it('still shows a single unambiguous candidate even if its department differs', () => {
    // SOCIOL 3487 / Fangqi Wen: one Wen, listed under Business — no collision.
    const edges = [edge('Fangqi', 'Wen', 'Business', 6)];
    const match = selectBestRmpMatch(edges, 'Fangqi Wen', {
      subject: 'SOCIOL',
    });
    expect(match?.department).toBe('Business');
  });

  it('maps a code whose RMP name differs via the override table (HISTART -> Art History)', () => {
    const edges = [
      edge('Alex', 'Rivera', 'Mathematics', 50),
      edge('Alex', 'Rivera', 'Art History', 3),
    ];
    const match = selectBestRmpMatch(edges, 'Alex Rivera', {
      subject: 'HISTART',
    });
    expect(match?.department).toBe('Art History');
  });

  it('maps an abbreviation to a rolled-up RMP department (BUSML -> Business)', () => {
    const edges = [
      edge('Jordan', 'Lee', 'Mathematics', 40),
      edge('Jordan', 'Lee', 'Business', 5),
    ];
    const match = selectBestRmpMatch(edges, 'Jordan Lee', { subject: 'BUSML' });
    expect(match?.department).toBe('Business');
  });

  it('maps Kinesiology to RMP "Physical Education" (RMP has no Kinesiology dept)', () => {
    const edges = [
      edge('Sam', 'Carter', 'Mathematics', 60),
      edge('Sam', 'Carter', 'Physical Education', 4),
    ];
    const match = selectBestRmpMatch(edges, 'Sam Carter', {
      subject: 'KINESIO',
    });
    expect(match?.department).toBe('Physical Education');
  });

  it('handles RMPs "Theater" spelling for the THEATRE code', () => {
    const edges = [
      edge('Robin', 'Diaz', 'Physics', 30),
      edge('Robin', 'Diaz', 'Theater', 6),
    ];
    const match = selectBestRmpMatch(edges, 'Robin Diaz', {
      subject: 'THEATRE',
    });
    expect(match?.department).toBe('Theater');
  });

  it('preserves legacy behavior (most-reviewed namesake) when no subject is provided', () => {
    const edges = [
      edge('Bethany', 'Everett', 'Mathematics', 80),
      edge('Bethany', 'Everett', 'Sociology', 4),
    ];
    const match = selectBestRmpMatch(edges, 'Bethany Everett');
    expect(match?.department).toBe('Mathematics');
  });
});

describe('SUBJECT_DEPARTMENT_KEYWORDS — table integrity', () => {
  it('uses normalized (lowercase, letters-only) keys and non-empty keyword lists', () => {
    for (const [code, keywords] of Object.entries(
      SUBJECT_DEPARTMENT_KEYWORDS
    )) {
      expect(code, `key "${code}" must be lowercase letters only`).toMatch(
        /^[a-z]+$/
      );
      expect(
        keywords.length,
        `"${code}" must have >=1 keyword`
      ).toBeGreaterThan(0);
      for (const kw of keywords) {
        expect(
          kw,
          `keyword "${kw}" of "${code}" must be lowercase letters only`
        ).toMatch(/^[a-z]+$/);
      }
    }
  });
});
