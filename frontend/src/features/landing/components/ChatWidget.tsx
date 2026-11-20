import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

type Message = { from: 'bot' | 'user'; text: string };

const greetings =
  'Good day, and welcome to LA Illustrada. I can help with rooms, dining, rates, and how to book. What would you like to know?';

const quickReplies = ['Room rates', 'Book a table', 'Check-in time', 'Cancel a booking'];

/** Keyword → answer. Checked in order; first match wins. */
const replies: { keys: string[]; answer: string }[] = [
  {
    keys: ['rate', 'price', 'cost', 'how much', 'magkano', 'per night'],
    answer:
      'Our rooms start at ₱3,200 per night for a Standard Queen and go up to ₱8,500 for the Executive Suite. Deluxe rooms and suites include breakfast; Standard rooms do not. Live prices and availability are on the Rooms page.',
  },
  {
    keys: ['book', 'reserve', 'reservation', 'booking', 'table', 'dining', 'restaurant', 'eat'],
    answer:
      'To book a room, choose Find a Room. For dining, choose Book a Table — we hold your table for 15 minutes until you confirm. Tables seat 2, 4, or 6 guests, and each visit runs for one hour.',
  },
  {
    keys: ['check in', 'check-in', 'checkin', 'check out', 'checkout', 'arrival'],
    answer:
      'Check-in starts at 3:00 PM and check-out is by 11:00 AM. If you will arrive late, just mention it in your booking notes and our reception team will hold the room for you.',
  },
  {
    keys: ['cancel', 'refund', 'change my', 'reschedule'],
    answer:
      'You can cancel from My reservations before your service starts. Refunds are processed by our staff at the front desk against your original payment — the amount depends on how close you are to your arrival date.',
  },
  {
    keys: ['pay', 'payment', 'card', 'gcash', 'cash', 'online'],
    answer:
      'Payment is settled at the property — cash, bank transfer, or card terminal. We do not collect card details online, so nothing is charged when you confirm a booking.',
  },
  {
    keys: ['contact', 'phone', 'email', 'address', 'where', 'location', 'find you'],
    answer:
      'You can reach us at +63 917 555 0142 or stay@lailustrada.example. We are at 88 Illustrada Avenue, Tagaytay Ridge. The full address and directions are in the Contact Us section.',
  },
  {
    keys: ['pet', 'dog', 'cat'],
    answer: 'Small pets are welcome in our garden rooms. Please tell us when booking so we can prepare the room.',
  },
  {
    keys: ['wifi', 'wi-fi', 'internet', 'parking', 'breakfast'],
    answer:
      'Every room includes complimentary Wi-Fi and breakfast for two. Secure parking is available on site at no extra charge.',
  },
  {
    keys: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'kumusta'],
    answer: 'Hello! How can I help you today — a room, a table, or a question about your stay?',
  },
  {
    keys: ['thank', 'salamat', 'thanks'],
    answer: 'You are most welcome. If you need anything else, our team is happy to help.',
  },
];

function answerFor(input: string) {
  const text = input.toLowerCase();
  const match = replies.find((entry) => entry.keys.some((key) => text.includes(key)));
  return (
    match?.answer ??
    'I want to make sure I answer correctly. For that question, please call us at +63 917 555 0142 or email stay@lailustrada.example and our team will reply right away.'
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: greetings }]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function toggle(next: boolean) {
    setOpen(next);
    if (next) setUnread(0);
  }

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, typing, open]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setDraft('');
    setTyping(true);
    timers.current.push(
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [...prev, { from: 'bot', text: answerFor(trimmed) }]);
        if (!open) setUnread((n) => n + 1);
      }, 700),
    );
  }

  return (
    <div className="fixed bottom-[26px] right-[26px] z-[80] flex flex-col items-end gap-3.5 max-[900px]:bottom-4 max-[900px]:right-4">
      {open && (
        <section className="flex h-[520px] w-[356px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-36px)] flex-col overflow-hidden border border-[#c8a783] bg-[#fff8ee] shadow-[0_26px_60px_rgba(55,24,8,.26)]" aria-label="Concierge chat">
          <header className="flex items-center gap-3 bg-[#54220e] px-5 py-[17px] text-[#f3e1c7]">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#b8763c]/25 text-[#f3e1c7]">
              <Sparkles size={17} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col leading-[1.35]">
              <b>LA Illustrada Concierge</b>
              <span>Typically replies in a few seconds</span>
            </div>
            <button className="border-0 bg-transparent p-1 text-[#f3e1c7]/70 hover:text-white" onClick={() => toggle(false)} aria-label="Close chat">
              <X size={17} />
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f7e8d2] px-[18px] py-5" ref={logRef} role="log" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[84%] px-[15px] py-[11px] text-[13px] leading-[1.6] ${message.from === 'bot' ? 'self-start border border-[#d8bfa0] bg-[#fff8ee] text-[#54220e]' : 'self-end bg-[#642c14] text-[#fff8ee]'}`}>
                {message.text}
              </div>
            ))}
            {typing && (
              <div className="flex self-start gap-[5px] bg-[#fff8ee] px-4 py-3.5" aria-label="Concierge is typing">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-[7px] bg-[#f7e8d2] px-[18px] pb-3.5">
              {quickReplies.map((reply) => (
                <button key={reply} className="border border-[#c8a783] bg-[#fff8ee] px-[13px] py-[7px] text-[11.5px] text-[#642c14] hover:bg-[#f1dfc8]" onClick={() => ask(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 border-t border-[#c8a783] bg-[#fff8ee] px-3.5 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <input
              className="min-h-11 min-w-0 flex-1 border border-[#c8a783] bg-[#fff8ee] px-3 py-2 text-sm text-[#54220e] placeholder:text-[#9b8068] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64b1c]"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about rooms, dining, or your stay…"
              aria-label="Your message"
            />
            <button className="flex h-10 w-10 shrink-0 items-center justify-center border-0 bg-[#642c14] p-0 text-[#f3e1c7] disabled:opacity-45" disabled={!draft.trim()} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
          <p className="bg-[#fff8ee] pb-[11px] text-center text-[10px] text-[#806348]">Automated assistant for general questions.</p>
        </section>
      )}

      {!open && (
        <span className="relative">
          <button
            className="relative inline-flex min-h-12 items-center justify-center gap-2 border border-[#b8763c] bg-[#642c14] px-5 py-3 font-serif font-bold text-[#fff8ee] shadow-[0_14px_32px_rgba(55,24,8,.24)] transition hover:-translate-y-0.5 hover:bg-[#54220e]"
            onClick={() => toggle(true)}
            aria-expanded={false}
            aria-label="Open concierge chat"
          >
            <MessageCircle size={18} /> Concierge
          </button>
          {unread > 0 && <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#f3e1c7] bg-[#b8763c] text-[11px] font-bold text-white">{unread}</span>}
        </span>
      )}
    </div>
  );
}
