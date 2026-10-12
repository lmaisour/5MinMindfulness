export function formatDurationMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

export function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
