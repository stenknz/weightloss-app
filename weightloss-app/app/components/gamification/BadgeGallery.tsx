'use client';

import { BadgeCard } from './BadgeCard';

interface Props {
  achievements: Array<{
    slug: string; name: string; description: string; category: string;
    unlocked: boolean; unlockedAt?: string; xpReward: number;
  }>;
}

const CATEGORY_ORDER = ['beginner', 'consistency', 'weight_loss', 'nutrition', 'special'];
const CATEGORY_LABELS: Record<string, string> = {
  beginner: 'Beginner', consistency: 'Consistency', weight_loss: 'Weight Loss',
  nutrition: 'Nutrition', special: 'Special',
};

export function BadgeGallery({ achievements }: Props) {
  const grouped: Record<string, typeof achievements> = {};
  for (const a of achievements) {
    (grouped[a.category] ??= []).push(a);
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map(cat => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--muted))' }}>
              {CATEGORY_LABELS[cat] ?? cat} ({items.filter(i => i.unlocked).length}/{items.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {items.map(a => <BadgeCard key={a.slug} {...a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
