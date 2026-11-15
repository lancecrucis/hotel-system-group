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
    <div className="lp-chat">
      {open && (
        <section className="lp-chat-panel" aria-label="Concierge chat">
          <header className="lp-chat-head">
            <span className="lp-chat-avatar">
              <Sparkles size={17} />
            </span>
            <div>
              <b>LA Illustrada Concierge</b>
              <span>Typically replies in a few seconds</span>
            </div>
            <button className="lp-chat-close" onClick={() => toggle(false)} aria-label="Close chat">
              <X size={17} />
            </button>
          </header>

          <div className="lp-chat-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`lp-chat-msg ${message.from}`}>
                {message.text}
              </div>
            ))}
            {typing && (
              <div className="lp-chat-typing" aria-label="Concierge is typing">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="lp-chat-suggestions">
              {quickReplies.map((reply) => (
                <button key={reply} className="lp-chat-chip" onClick={() => ask(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form
            className="lp-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about rooms, dining, or your stay…"
              aria-label="Your message"
            />
            <button className="lp-chat-send" disabled={!draft.trim()} aria-label="Send message">
              <Send size={16} />
            </button>
          </form>
          <p className="lp-chat-foot">Automated assistant for general questions.</p>
        </section>
      )}

      {!open && (
        <span className="lp-chat-tooltip-wrap">
          <button className="lp-chat-tooltip" onClick={() => toggle(true)}>
            <Sparkles size={13} aria-hidden="true" /> Questions?
          </button>
        </span>
      )}

      {!open && (
        <span className="lp-chat-fab-wrap">
          <button
            className="lp-chat-fab"
            onClick={() => toggle(true)}
            aria-expanded={false}
            aria-label="Open concierge chat"
          >
            <MessageCircle size={25} />
          </button>
          {unread > 0 && <span className="lp-chat-badge">{unread}</span>}
        </span>
      )}
    </div>
  );
}
