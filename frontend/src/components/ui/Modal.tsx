import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, children, onClose, className }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} className={className} onCancel={onClose} aria-labelledby={id}>
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
