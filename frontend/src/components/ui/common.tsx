import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';
import { label } from '../../utils/format';
export function Badge({ status }: { status: string }) {
  const tone = ['checked_in', 'seated', 'admin', 'staff'].includes(status)
    ? 'border-[#642c14] bg-[#642c14] text-white'
    : ['pending', 'arrived', 'refunded', 'partially_refunded'].includes(status)
      ? 'border-dashed border-[#b99673] bg-[#fff8ee] text-[#70462c]'
      : ['cancelled', 'no_show', 'maintenance', 'expired'].includes(status)
        ? 'border-[#d8bfa0] bg-[#ead5b8] text-[#70462c]'
        : 'border-[#d8bfa0] bg-[#f7e8d2] text-[#70462c]';
  return <span className={`inline-flex whitespace-nowrap rounded-sm border px-2.5 py-[5px] text-[10px] font-semibold leading-[1.3] ${tone}`}>{label(status)}</span>;
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="mb-5 flex items-start gap-2.5 overflow-wrap-anywhere border border-[#b54724] bg-[#fff0e7] px-[15px] py-[13px] text-[13px] text-[#782c18]" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Success({ message }: { message: string }) {
  return message ? (
    <div className="mb-5 flex items-start gap-2.5 border border-[#9b754f] bg-[#f7e8d2] px-[15px] py-[13px] text-[13px] text-[#54220e]" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  ) : null;
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-[#b99673] bg-[#fff8ee] px-6 py-[50px] text-center text-[#70462c]">
      <Inbox size={30} />
      <h3 className="mb-2 font-['Gelasio'] text-[22px] font-normal leading-[1.3] text-[#54220e]">{title}</h3>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <p className="font-serif text-lg text-[#70462c]" role="status">
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
        <h1 className="mb-3 font-['Gelasio'] text-[32px] font-normal leading-[1.15] tracking-[-.5px] text-[#441901] max-[800px]:text-[25px]">{title}</h1>
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
    <dialog ref={ref} className={`border border-[#b99673] bg-[#fff8ee] text-[#54220e] shadow-[0_22px_70px_rgba(55,24,8,.22)] ${className ?? ''}`} onCancel={onClose} aria-labelledby={id}>
      <div className="mb-[22px] flex items-center justify-between gap-[15px]">
        <h2 className="m-0 font-['Gelasio'] text-xl font-normal text-[#441901]" id={id}>{title}</h2>
        <button className="min-h-9 border-0 bg-transparent p-2 text-[#70462c] hover:text-[#441901]" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
