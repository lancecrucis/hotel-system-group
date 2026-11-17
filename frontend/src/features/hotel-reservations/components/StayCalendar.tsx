import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { day, dateLabel, nights } from '../../../utils/format';

type Stay = { checkIn: string; checkOut: string };

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function StayCalendar({ value, onChange }: { value: Stay; onChange: (value: Stay) => void }) {
  const [step, setStep] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [month, setMonth] = useState(value.checkIn.slice(0, 7));
  const today = day();
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  function changeMonth(amount: number) {
    const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + amount, 1));
    setMonth(next.toISOString().slice(0, 7));
  }
  function choose(date: string) {
    if (step === 'checkIn') {
      onChange({ checkIn: date, checkOut: value.checkOut > date && nights(date, value.checkOut) <= 30 ? value.checkOut : addDays(date, 1) });
      setStep('checkOut');
    } else {
      onChange({ ...value, checkOut: date });
      setStep('checkIn');
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8e8e8] p-3.5" aria-label="Choose stay dates">
      <div className="grid grid-cols-2 gap-[7px]">
        <button type="button" className={`flex min-h-0 flex-col items-start gap-px rounded-[11px] border px-[11px] py-[9px] text-left ${step === 'checkIn' ? 'border-[#1d1d1d] bg-[#f6f6f6]' : 'border-[#e8e8e8] bg-white'}`} onClick={() => { setStep('checkIn'); setMonth(value.checkIn.slice(0, 7)); }}>
          <span>Check-in</span><strong>{dateLabel(value.checkIn)}</strong>
        </button>
        <button type="button" className={`flex min-h-0 flex-col items-start gap-px rounded-[11px] border px-[11px] py-[9px] text-left ${step === 'checkOut' ? 'border-[#1d1d1d] bg-[#f6f6f6]' : 'border-[#e8e8e8] bg-white'}`} onClick={() => { setStep('checkOut'); setMonth(value.checkOut.slice(0, 7)); }}>
          <span>Check-out</span><strong>{dateLabel(value.checkOut)}</strong>
        </button>
      </div>
      <div className="my-[15px] flex items-center justify-between">
        <strong>{title}</strong>
        <div>
          <button className="min-h-0 border-0 bg-transparent p-1 text-[#1d1d1d] hover:bg-[#eee]" type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
          <button className="min-h-0 border-0 bg-transparent p-1 text-[#1d1d1d] hover:bg-[#eee]" type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <span className="py-[5px] text-[10px] text-[#6e6e6e]" key={name}>{name}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const disabled = date < today || (step === 'checkOut' && (date <= value.checkIn || date > addDays(value.checkIn, 30)));
          const isStart = date === value.checkIn;
          const isEnd = date === value.checkOut;
          return <button type="button" key={date} disabled={disabled} className={`min-h-[34px] rounded-[9px] border-0 p-0 text-xs ${isStart || isEnd ? 'bg-[#1d1d1d] text-white' : date > value.checkIn && date < value.checkOut ? 'bg-[#f0f0f0] text-[#1d1d1d]' : 'bg-white text-[#1d1d1d]'} disabled:cursor-default disabled:text-[#bcbcbc]`} aria-label={`${dateLabel(date)}${isStart ? ', check-in' : isEnd ? ', check-out' : ''}`} aria-pressed={isStart || isEnd} onClick={() => choose(date)}>{index + 1}</button>;
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-[#6e6e6e]">{step === 'checkIn' ? 'Select an arrival date.' : 'Select a departure date, up to 30 nights later.'}</p>
    </section>
  );
}
