import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Check, LoaderCircle } from 'lucide-react';
import { api, send } from '../../../services/client';
import { dateLabel, label, money } from '../../../utils/format';

type RoomCard = { type: 'rooms'; rooms: Array<{ id: string; room_number: string; room_type: string; price_per_night: string; capacity: number; bed_type: string; bed_count: number; breakfast_included: boolean }> };
type Reservation = { reference: string; status: string; room_type?: string; room_number?: string; check_in?: string; check_out?: string; guest_count?: number; total?: string };
type Card =
  | RoomCard
  | { type: 'booking_confirmation'; intent_id: string; expires_at: string; reservation: Reservation; state?: 'pending' | 'done' | 'cancelled' | 'error' }
  | { type: 'cancellation_confirmation'; intent_id: string; expires_at: string; reservation: Reservation; reason: string; state?: 'pending' | 'done' | 'cancelled' | 'error' }
  | { type: 'reservation_status'; reservation: Reservation }
  | { type: 'reservation_list'; reservations: Reservation[] };
type Message = { from: 'bot' | 'user'; text: string; cards?: Card[]; activity?: string[] };
type ChatResponse = { reply: string; cards: Card[]; activity: string[] };

const greetings = 'Welcome to LA Illustrada. I can help you search live room availability, prepare a room booking, cancel your room reservation, or check its status.';
const quickReplies = ['What can you help with?', 'Find a room', 'Check my reservation'];
const processingSteps = ['Understanding your request', 'Checking live hotel information', 'Preparing a secure response'];

function inlineAssistantText(value: string) {
  const normalized = value.replace(/\$(?=\s?\d)/g, '₱');
  return normalized.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>,
  );
}

function AssistantText({ text }: { text: string }) {
  return (
    <div className="grid gap-1">
      {text.split(/\r?\n/).map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span className="h-1" key={index} />;
        if (trimmed.startsWith('- '))
          return <div className="flex gap-2" key={index}><span aria-hidden="true">•</span><span>{inlineAssistantText(trimmed.slice(2))}</span></div>;
        return <div key={index}>{inlineAssistantText(trimmed)}</div>;
      })}
    </div>
  );
}

function ReservationDetails({ reservation }: { reservation: Reservation }) {
  return (
    <div className="mt-2 grid gap-1 border-t border-[#d8bfa0] pt-2 text-[11px]">
      {reservation.room_type && <strong>{reservation.room_type}{reservation.room_number ? ` · Room ${reservation.room_number}` : ''}</strong>}
      {reservation.check_in && reservation.check_out && <span>{dateLabel(reservation.check_in)} – {dateLabel(reservation.check_out)}</span>}
      {reservation.guest_count && <span>{reservation.guest_count} guest{reservation.guest_count === 1 ? '' : 's'}</span>}
      {reservation.total && <strong>Total {money(reservation.total)}</strong>}
      {reservation.reference !== 'Pending confirmation' && <span>Reference: {reservation.reference}</span>}
    </div>
  );
}

function CardView({ card, onConfirm, onCancel, busy }: { card: Card; onConfirm: (intentId: string) => void; onCancel: (intentId: string) => void; busy: string | null }) {
  if (card.type === 'rooms') return <div className="mt-2 grid gap-2">{card.rooms.length === 0 && <span className="text-[11px]">No rooms are available for those dates.</span>}{card.rooms.slice(0, 5).map((room) => <div className="border border-[#d8bfa0] bg-[#fffaf3] p-2.5" key={room.id}><div className="flex items-start justify-between gap-2"><strong>{room.room_type}</strong><span className="font-serif text-[15px]">{money(room.price_per_night)}</span></div><div className="mt-1 text-[11px] text-[#806348]">Room {room.room_number} · up to {room.capacity} · {room.bed_count} {room.bed_type} bed{room.bed_count === 1 ? '' : 's'}</div>{room.breakfast_included && <div className="mt-1 text-[10px] uppercase tracking-[.12em] text-[#a64b1c]">Breakfast included</div>}</div>)}</div>;
  if (card.type === 'booking_confirmation' || card.type === 'cancellation_confirmation') {
    const isBooking = card.type === 'booking_confirmation';
    const state = card.state ?? 'pending';
    return <div className="mt-2 border border-[#b99673] bg-[#fffaf3] p-3"><div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#a64b1c]"><span>{isBooking ? 'Review room booking' : 'Review cancellation'}</span>{state === 'done' && <Check size={14} aria-label="Completed" />}</div><ReservationDetails reservation={card.reservation} />{!isBooking && <p className="mt-2 text-[11px] text-[#806348]">Reason: {card.reason}</p>}{state === 'pending' && <div className="mt-3 flex gap-2"><button className="flex-1 bg-[#642c14] px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-50" disabled={busy === card.intent_id} onClick={() => onConfirm(card.intent_id)}>{busy === card.intent_id ? <LoaderCircle className="mx-auto animate-spin" size={14} /> : isBooking ? 'Confirm booking' : 'Confirm cancellation'}</button><button className="border border-[#c8a783] px-3 py-2 text-[11px] text-[#642c14]" disabled={busy === card.intent_id} onClick={() => onCancel(card.intent_id)}>Dismiss</button></div>}{state === 'done' && <p className="mt-2 text-[11px] text-[#416044]">Completed successfully.</p>}{state === 'error' && <p className="mt-2 text-[11px] text-[#9b2c20]">This confirmation could not be completed. Please start again.</p>}</div>;
  }
  if (card.type === 'reservation_status') return <div className="mt-2 border border-[#d8bfa0] bg-[#fffaf3] p-3"><strong>{label(card.reservation.status)}</strong><ReservationDetails reservation={card.reservation} /></div>;
  return <div className="mt-2 grid gap-2">{card.reservations.length === 0 && <span className="text-[11px]">There are no hotel reservations in your account.</span>}{card.reservations.map((reservation) => <div className="border border-[#d8bfa0] bg-[#fffaf3] p-2.5" key={reservation.reference}><strong>{reservation.reference}</strong><span className="ml-2 text-[11px]">{label(reservation.status)}</span><ReservationDetails reservation={reservation} /></div>)}</div>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: greetings }]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle(next: boolean) { setOpen(next); if (next) setUnread(0); }
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight; }, [messages, typing, open]);
  useEffect(() => {
    if (!typing) {
      setProcessingStep(0);
      return undefined;
    }
    const timer = window.setInterval(() => setProcessingStep((step) => (step + 1) % processingSteps.length), 1200);
    return () => window.clearInterval(timer);
  }, [typing]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || typing) return;
    const history = messages.map((message) => ({ role: message.from === 'user' ? 'user' as const : 'assistant' as const, content: message.text }));
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]); setDraft(''); setTyping(true); setError('');
    try { const response = await api<ChatResponse>('/assistant/chat', send('POST', { message: trimmed, history })); setMessages((prev) => [...prev, { from: 'bot', text: response.reply, cards: response.cards, activity: response.activity }]); if (!open) setUnread((count) => count + 1); }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'The assistant is temporarily unavailable.'; setError(message); setMessages((prev) => [...prev, { from: 'bot', text: 'I could not reach the hotel assistant right now. Please try again in a moment.' }]); }
    finally { setTyping(false); }
  }

  async function confirm(intentId: string) {
    setConfirming(intentId); setError('');
    try {
      const response = await api<{ reservation: { reservation_reference: string }; action: string }>('/assistant/confirm', send('POST', { intent_id: intentId }));
      setMessages((prev) => prev.map((message) => ({ ...message, cards: message.cards?.map((card) => 'intent_id' in card && card.intent_id === intentId ? { ...card, state: 'done' as const } : card) })));
      setMessages((prev) => [...prev, { from: 'bot', text: response.action === 'book_room' ? `Your room is booked. Your reference is ${response.reservation.reservation_reference}.` : `Your reservation ${response.reservation.reservation_reference} has been cancelled.` }]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The confirmation could not be completed.'); setMessages((prev) => prev.map((message) => ({ ...message, cards: message.cards?.map((card) => 'intent_id' in card && card.intent_id === intentId ? { ...card, state: 'error' as const } : card) })));
    } finally { setConfirming(null); }
  }
  function dismiss(intentId: string) { setMessages((prev) => prev.map((message) => ({ ...message, cards: message.cards?.map((card) => 'intent_id' in card && card.intent_id === intentId ? { ...card, state: 'cancelled' as const } : card) }))); }

  return <div className="fixed bottom-[26px] right-[26px] z-[80] flex flex-col items-end gap-3.5 max-[900px]:bottom-4 max-[900px]:right-4">
    {open && <section className="flex h-[570px] w-[380px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-36px)] flex-col overflow-hidden border border-[#c8a783] bg-[#fff8ee] shadow-[0_26px_60px_rgba(55,24,8,.26)]" aria-label="illu agent hotel reservation assistant">
      <header className="flex items-center gap-3 bg-[#54220e] px-5 py-[17px] text-[#f3e1c7]"><span className="grid h-9 w-9 shrink-0 place-items-center bg-[#b8763c]/25 text-[#f3e1c7]"><Sparkles size={17} /></span><div className="flex min-w-0 flex-1 flex-col leading-[1.35]"><b>illu agent</b><span>Live room reservations · customer access</span></div><button className="border-0 bg-transparent p-1 text-[#f3e1c7]/70 hover:text-white" onClick={() => toggle(false)} aria-label="Close chat"><X size={17} /></button></header>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f7e8d2] px-[18px] py-5" ref={logRef} role="log" aria-live="polite">{messages.map((message, index) => <div key={index} className={`max-w-[90%] px-[15px] py-[11px] text-[13px] leading-[1.6] ${message.from === 'bot' ? 'self-start border border-[#d8bfa0] bg-[#fff8ee] text-[#54220e]' : 'self-end bg-[#642c14] text-[#fff8ee]'}`}><AssistantText text={message.text} />{message.activity && message.from === 'bot' && <div className="mt-2 border-t border-[#d8bfa0] pt-2 text-[9px] uppercase tracking-[.1em] text-[#9b8068]">illu agent process · {message.activity.join(' · ')}</div>}{message.cards?.map((card, cardIndex) => <CardView key={`${card.type}-${cardIndex}`} card={card} onConfirm={confirm} onCancel={dismiss} busy={confirming} />)}</div>)}{typing && <div className="flex self-start items-center gap-2 border border-[#d8bfa0] bg-[#fff8ee] px-4 py-3 text-[10px] uppercase tracking-[.08em] text-[#9b8068]" aria-label="illu agent is processing"><span>{processingSteps[processingStep]}…</span><span className="flex gap-[3px]"><i /><i /><i /></span></div>}</div>
      {error && <p className="m-0 bg-[#fff8ee] px-[18px] py-2 text-[10px] text-[#9b2c20]" role="alert">{error}</p>}
      {messages.length <= 1 && <div className="flex flex-wrap gap-[7px] bg-[#f7e8d2] px-[18px] pb-3.5">{quickReplies.map((reply) => <button key={reply} className="border border-[#c8a783] bg-[#fff8ee] px-[13px] py-[7px] text-[11.5px] text-[#642c14] hover:bg-[#f1dfc8]" onClick={() => void ask(reply)}>{reply}</button>)}</div>}
      <form className="flex items-center gap-2 border-t border-[#c8a783] bg-[#fff8ee] px-3.5 py-3" onSubmit={(event) => { event.preventDefault(); void ask(draft); }}><input className="min-h-11 min-w-0 flex-1 border border-[#c8a783] bg-[#fff8ee] px-3 py-2 text-sm text-[#54220e] placeholder:text-[#9b8068] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64b1c]" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search or manage a room reservation…" aria-label="Your message" /><button className="flex h-10 w-10 shrink-0 items-center justify-center border-0 bg-[#642c14] p-0 text-[#f3e1c7] disabled:opacity-45" disabled={!draft.trim() || typing} aria-label="Send message"><Send size={16} /></button></form>
      <p className="bg-[#fff8ee] pb-[11px] text-center text-[10px] text-[#806348]">Live availability is rechecked before a booking is created.</p>
    </section>}
    {!open && <span className="relative"><button className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#b8763c] bg-[#642c14] p-0 text-[#fff8ee] shadow-[0_14px_32px_rgba(55,24,8,.24)] transition hover:-translate-y-0.5 hover:bg-[#54220e]" onClick={() => toggle(true)} aria-expanded={false} aria-label="Open illu agent"><MessageCircle size={20} aria-hidden="true" /></button>{unread > 0 && <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#f3e1c7] bg-[#b8763c] text-[11px] font-bold text-white">{unread}</span>}</span>}
  </div>;
}
