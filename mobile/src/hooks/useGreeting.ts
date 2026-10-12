export function useGreeting(displayName?: string) {
  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (displayName?.trim()) {
    return `${timeOfDay}, ${displayName.trim()}.`;
  }

  return 'Take a moment for yourself.';
}
