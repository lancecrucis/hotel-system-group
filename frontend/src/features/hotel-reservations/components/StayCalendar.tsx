import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { day, dateLabel, nights } from '../../../utils/format';

type Stay = { checkIn: string; checkOut: string };

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monthOffset(value: string, amount: number) {
  const date = new Date(`${value}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function MonthGrid({ month, today, value, step, onChoose }: {
  month: string;
  today: string;
  value: Stay;
  step: 'checkIn' | 'checkOut';
  onChoose: (date: string) => void;
}) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = first.getUTCDay();
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  return (
    <div className="min-w-0" aria-label={title}>
      <h3 className="mb-3 text-center font-sans text-sm font-semibold text-[#54220e]">{title}</h3>
      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((name) => (
          <span className="grid h-9 place-items-center text-[11px] font-medium text-[#806348]" key={name}>{name}</span>
        ))}
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${month}-${index}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const outOfRange = date < today || (step === 'checkOut' && (date <= value.checkIn || date > addDays(value.checkIn, 30)));
          const isStart = date === value.checkIn;
          const isEnd = date === value.checkOut;
          const inRange = Boolean(value.checkOut) && date >= value.checkIn && date <= value.checkOut;
          const marker = isStart
            ? 'bg-[#32744b] text-white hover:bg-[#28613e]'
            : isEnd
              ? 'bg-[#aa4136] text-white hover:bg-[#93362d]'
              : 'text-[#54220e] hover:bg-[#f3e1c7]';
          return (
            <span
              className={`grid h-10 place-items-center ${inRange && isStart ? 'rounded-l-full' : ''} ${inRange && isEnd ? 'rounded-r-full' : ''}`}
              style={inRange ? { backgroundColor: '#f3e7d7', borderTop: '1px solid #e5d3bd', borderBottom: '1px solid #e5d3bd' } : undefined}
              key={date}
            >
              <button
                type="button"
                disabled={outOfRange}
                className={`grid aspect-square w-full max-w-9 place-items-center rounded-full border-0 p-0 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b4d28] ${outOfRange && !isStart ? 'cursor-not-allowed text-[#b7aa9c] line-through' : marker}`}
                aria-label={`${dateLabel(date)}${isStart ? ', check-in, start of selected stay' : outOfRange ? ', unavailable' : isEnd ? ', check-out, end of selected stay' : inRange ? ', within selected stay' : ', available'}`}
                aria-disabled={outOfRange}
                aria-pressed={isStart || isEnd}
                onClick={() => onChoose(date)}
              >
                {index + 1}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function StayCalendar({ value, onChange }: { value: Stay; onChange: (value: Stay) => void }) {
  const [step, setStep] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [month, setMonth] = useState(value.checkIn.slice(0, 7));
  const today = day();

  function choose(date: string) {
    if (step === 'checkIn') {
      onChange({ checkIn: date, checkOut: '' });
      setStep('checkOut');
      return;
    }
    onChange({ ...value, checkOut: date });
    setStep('checkIn');
  }

  return (
    <section className="@container rounded-2xl border border-[#e2d1bd] bg-[#fffaf2] p-4 text-[#54220e] shadow-[0_12px_38px_rgba(84,34,14,.12)] sm:p-5" aria-label="Choose stay dates">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[#f3e7d7] p-1">
        <button
          type="button"
          className={`flex min-h-[58px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8b4d28] ${step === 'checkIn' ? 'border-[#d8bfa0] bg-[#fffaf2] shadow-sm' : 'border-transparent bg-transparent'}`}
          onClick={() => setStep('checkIn')}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#806348]">Check-in</span>
          <strong className="mt-0.5 text-[13px] font-semibold text-[#54220e]">{dateLabel(value.checkIn)}</strong>
        </button>
        <button
          type="button"
          className={`flex min-h-[58px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#aa4136] ${step === 'checkOut' ? 'border-[#d8bfa0] bg-[#fffaf2] shadow-sm' : 'border-transparent bg-transparent'}`}
          onClick={() => setStep('checkOut')}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#806348]">Check-out</span>
          <strong className={`mt-0.5 text-[13px] font-semibold ${value.checkOut ? 'text-[#54220e]' : 'text-[#806348]'}`}>{value.checkOut ? dateLabel(value.checkOut) : 'Select date'}</strong>
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          className="grid h-9 w-9 place-items-center rounded-full border-0 bg-transparent p-0 text-[#642c14] hover:bg-[#f3e1c7] focus-visible:outline-2 focus-visible:outline-[#8b4d28] disabled:text-[#b7aa9c]"
          type="button"
          aria-label="Previous month"
          disabled={month <= today.slice(0, 7)}
          onClick={() => setMonth(monthOffset(month, -1))}
        ><ChevronLeft size={18} /></button>
        <span className="text-[11px] text-[#806348]">{step === 'checkIn' ? 'Choose your arrival' : 'Choose your departure'}</span>
        <button
          className="grid h-9 w-9 place-items-center rounded-full border-0 bg-transparent p-0 text-[#642c14] hover:bg-[#f3e1c7] focus-visible:outline-2 focus-visible:outline-[#8b4d28]"
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(monthOffset(month, 1))}
        ><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-1 gap-5 @min-[700px]:grid-cols-2 @min-[700px]:gap-7">
        <MonthGrid month={month} today={today} value={value} step={step} onChoose={choose} />
        <div className="hidden @min-[700px]:block">
          <MonthGrid month={monthOffset(month, 1)} today={today} value={value} step={step} onChoose={choose} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#e3d6c7] pt-3 text-xs">
        <span className="text-[#806348]">{value.checkOut ? `${nights(value.checkIn, value.checkOut)} ${nights(value.checkIn, value.checkOut) === 1 ? 'night' : 'nights'}` : 'Select a check-out date'}</span>
        <span className="flex items-center gap-3 text-[10px] text-[#806348]">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#32744b]" aria-hidden="true" />Arrival</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#aa4136]" aria-hidden="true" />Departure</span>
        </span>
      </div>
    </section>
  );
}
