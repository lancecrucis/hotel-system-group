import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';
import { label } from '../../utils/format';
export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{label(status)}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Success({ message }: { message: string }) {
  return message ? (
    <div className="notice success" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  ) : null;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <p className="muted" role="status">
      Loading…
    </p>
  );
}
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby={id}>
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
