import { useEffect, useState } from 'react';
import { resolveProfessorPhoto } from '@/lib/photo';

/**
 * Resolves a professor headshot URL (best-effort, cached) from the instructor's
 * OSU email — captured by the content script from the class API — via OSU's
 * university-wide photo service. Returns null while loading or when the person
 * has no photo, so the caller can fall back to initials.
 */
export function useProfessorPhoto(email: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!email) return;

    resolveProfessorPhoto(email)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  return url;
}
