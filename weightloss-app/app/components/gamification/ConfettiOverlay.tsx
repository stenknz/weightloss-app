'use client';

import confetti from 'canvas-confetti';

export function fireLevelUp() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0ea5a0', '#3b82f6', '#22c55e'] });
}

export function fireAchievement() {
  confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 }, colors: ['#f59e0b', '#3b82f6'] });
}

export function fireStreak() {
  confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 }, colors: ['#ef4444', '#f97316'] });
}
