import { label } from '@/utils/format';
export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{label(status)}</span>;
}
