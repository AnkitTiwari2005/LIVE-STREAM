/**
 * Builds a clean ASCII URL slug from a pandit's name, falling back to a stable UUID prefix
 * when the display name contains non-Latin script only (e.g. pure Devanagari).
 */
export function buildStreamerSlugBase(name: string | null | undefined, userId: string): string {
  const ascii = (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/g, '');

  if (ascii.length >= 2) {
    return ascii;
  }

  const cleanId = (userId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'acharya';
  return `pandit-${cleanId}`;
}

/**
 * Resolves a collision-free unique slug for StreamerProfile.
 */
export async function resolveUniqueStreamerSlug(
  prisma: any,
  name: string | null | undefined,
  userId: string,
): Promise<string> {
  const base = buildStreamerSlugBase(name, userId);

  for (let suffix = 1; suffix <= 20; suffix++) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await prisma.streamerProfile.findFirst({
      where: { slug: candidate },
      select: { userId: true },
    });
    if (!existing || existing.userId === userId) {
      return candidate;
    }
  }

  const cleanId = (userId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || Date.now().toString(36);
  return `${base.slice(0, 80)}-${cleanId}`;
}
