'use client';

import { useEffect } from 'react';
import { fireLevelUp } from './ConfettiOverlay';

interface Props {
  oldLevel: number;
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpModal({ oldLevel, newLevel, onDismiss }: Props) {
  useEffect(() => {
    fireLevelUp();
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onDismiss}>
      <div className="text-center animate-bounce">
        <div className="text-6xl mb-4">🎉</div>
        <div className="text-3xl font-bold text-white mb-2">Level Up!</div>
        <div className="text-6xl font-bold bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
          {oldLevel} → {newLevel}
        </div>
      </div>
    </div>
  );
}
