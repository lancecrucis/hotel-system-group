import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
