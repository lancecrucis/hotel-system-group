import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';
import { label } from '../../utils/format';
export function Badge({ status }: { status: string }) {
  const tone = ['checked_in', 'seated', 'admin', 'staff'].includes(status)
    ? 'border-[#262626] bg-[#262626] text-white'
    : ['pending', 'arrived', 'refunded', 'partially_refunded'].includes(status)
      ? 'border-dashed border-[#a3a3a3] bg-white text-[#525252]'
      : ['cancelled', 'no_show', 'maintenance', 'expired'].includes(status)
        ? 'border-[#e4e4e4] bg-[#ededed] text-[#525252]'
        : 'border-[#e4e4e4] bg-[#f5f5f5] text-[#303030]';
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-[5px] text-[10px] font-semibold leading-[1.3] ${tone}`}>{label(status)}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="mb-5 flex items-start gap-2.5 overflow-wrap-anywhere rounded-[7px] border border-[#161616] bg-[#f5f5f5] px-[15px] py-[13px] text-[13px] text-[#161616]" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Success({ message }: { message: string }) {
  return message ? (
    <div className="mb-5 flex items-start gap-2.5 rounded-[7px] border border-[#d4d4d4] bg-white px-[15px] py-[13px] text-[13px] text-[#303030]" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  ) : null;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[9px] border border-dashed border-[#e8e8e8] bg-white px-6 py-[50px] text-center text-[#6e6e6e]">
      <Inbox size={30} />
      <h3 className="mb-2 text-[17px] font-semibold leading-[1.3] text-[#656565]">{title}</h3>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <p className="text-[#6e6e6e]" role="status">
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
    <header className="mb-[27px] flex items-center justify-between gap-5 max-[800px]:items-start max-[500px]:flex-wrap max-[500px]:gap-3">
      <div>
        <h1 className="mb-3 text-[32px] font-semibold leading-[1.15] tracking-[-1px] max-[800px]:text-[25px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} className={className} onCancel={onClose} aria-labelledby={id}>
      <div className="mb-[22px] flex items-center justify-between gap-[15px]">
        <h2 className="m-0 text-xl font-semibold" id={id}>{title}</h2>
        <button className="min-h-9 border-0 bg-transparent p-2 text-[#6e6e6e] hover:text-[#1d1d1d]" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
