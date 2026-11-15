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
    <section className="stay-calendar" aria-label="Choose stay dates">
      <div className="stay-date-tabs">
        <button type="button" className={step === 'checkIn' ? 'active' : ''} onClick={() => { setStep('checkIn'); setMonth(value.checkIn.slice(0, 7)); }}>
          <span>Check-in</span><strong>{dateLabel(value.checkIn)}</strong>
        </button>
        <button type="button" className={step === 'checkOut' ? 'active' : ''} onClick={() => { setStep('checkOut'); setMonth(value.checkOut.slice(0, 7)); }}>
          <span>Check-out</span><strong>{dateLabel(value.checkOut)}</strong>
        </button>
      </div>
      <div className="stay-calendar-head">
        <strong>{title}</strong>
        <div>
          <button type="button" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="stay-calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => <span className="weekday" key={name}>{name}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const disabled = date < today || (step === 'checkOut' && (date <= value.checkIn || date > addDays(value.checkIn, 30)));
          const isStart = date === value.checkIn;
          const isEnd = date === value.checkOut;
          return <button type="button" key={date} disabled={disabled} className={[isStart || isEnd ? 'selected' : '', date > value.checkIn && date < value.checkOut ? 'in-range' : ''].join(' ')} aria-label={`${dateLabel(date)}${isStart ? ', check-in' : isEnd ? ', check-out' : ''}`} aria-pressed={isStart || isEnd} onClick={() => choose(date)}>{index + 1}</button>;
        })}
      </div>
      <p className="stay-calendar-hint">{step === 'checkIn' ? 'Select an arrival date.' : 'Select a departure date, up to 30 nights later.'}</p>
    </section>
  );
}
