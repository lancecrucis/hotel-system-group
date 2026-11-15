import { CheckCircle2 } from 'lucide-react';
export function Success({ message }: { message: string }) {
  return message ? (
    <div className="notice success" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  ) : null;
}
