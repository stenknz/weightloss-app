export function validateEvent(eventType: string, data?: Record<string, unknown>): { allowed: boolean; reason?: string } {
  if (eventType === 'weigh_in_logged') {
    const weight = Number(data?.weight_kg);
    if (Number.isFinite(weight) && weight > 500) return { allowed: false, reason: 'unrealistic_weight' };
  }
  if (eventType === 'steps_logged') {
    const steps = Number(data?.steps);
    if (Number.isFinite(steps) && steps > 200000) return { allowed: false, reason: 'unrealistic_steps' };
  }
  return { allowed: true };
}
