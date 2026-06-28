export function validateEvent(eventType: string, data?: Record<string, unknown>): { allowed: boolean; reason?: string } {
  if (eventType === 'weigh_in_logged') {
    const weight = data?.weight_kg as number | undefined;
    if (weight != null && weight > 500) return { allowed: false, reason: 'unrealistic_weight' };
  }
  if (eventType === 'steps_logged') {
    const steps = data?.steps as number | undefined;
    if (steps != null && steps > 200000) return { allowed: false, reason: 'unrealistic_steps' };
  }
  return { allowed: true };
}
