import { ReactNode } from 'react';

export function GlassCard({ children, className = '', hover = false, as: Tag = 'div' }: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'section' | 'article' | 'form' | 'a';
}) {
  return (
    <Tag className={`card ${hover ? 'card-hover' : ''} ${className}`}>
      {children}
    </Tag>
  );
}
