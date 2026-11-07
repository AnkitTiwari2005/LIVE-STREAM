/**
 * Resolves the public-facing LiveKit WebSocket URL.
 * Throws in production if not explicitly configured to prevent connecting
 * to external or invalid test instances (B-02).
 */
export function getLiveKitPublicUrl(): string {
  const url =
    process.env.LIVEKIT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL;

  if (url) {
    return url;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('LIVEKIT_PUBLIC_URL must be configured in production');
  }

  return 'ws://localhost:7880';
}
