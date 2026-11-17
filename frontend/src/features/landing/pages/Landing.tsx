import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  BedDouble,
  Coffee,
  Wifi,
  MapPin,
  Clock,
  UtensilsCrossed,
  CalendarCheck,
  MessageCircle,
} from 'lucide-react';
import { useQuery } from '../../../hooks/useQuery';
import type { Room, Settings } from '../../../types/models';
import { money } from '../../../utils/format';
import { LandingNav } from '../components/LandingNav';
import { ChatWidget } from '../components/ChatWidget';
import '../landing.css';

const HOTEL_NAME = 'LA Illustrada';

/** Fallback content shown when the API is unreachable or empty. */
const featured = [
  {
    room_type: 'Deluxe King',
    description: 'A calm retreat with a king bed, warm timber, and views over the ridge.',
    price_per_night: '4500',
    capacity: 2,
    bed_count: 1,
    bed_type: 'King',
    image: '/images/rooms/deluxe-king.webp',
  },
  {
    room_type: 'Deluxe Twin',
    description: 'A generous room for friends or a small family, with two double beds.',
    price_per_night: '4500',
    capacity: 3,
    bed_count: 2,
    bed_type: 'Double',
    image: '/images/rooms/deluxe-twin.webp',
  },
  {
    room_type: 'Family Suite',
    description: 'A separate lounge and space for the whole family to settle in.',
    price_per_night: '6500',
    capacity: 4,
    bed_count: 2,
    bed_type: 'Queen',
    image: '/images/rooms/family-suite.webp',
  },
  {
    room_type: 'Executive Suite',
    description: 'Our largest suite with a private lounge and a terrace over the garden.',
    price_per_night: '8500',
    capacity: 2,
    bed_count: 1,
    bed_type: 'King',
    image: '/images/rooms/executive-suite.webp',
  },
];

type Card = {
  type: string;
  description: string;
  price: string;
  capacity: number;
  bedCount: number;
  bedType: string;
  image: string;
  amenities: string[];
};

function roomImage(room: Room) {
  const type = room.room_type.toLowerCase();
  if (type.includes('executive')) return '/images/rooms/executive-suite.webp';
  if (type.includes('family')) return '/images/rooms/family-suite.webp';
  if (type.includes('twin') || room.bed_count > 1) return '/images/rooms/deluxe-twin.webp';
  return '/images/rooms/deluxe-king.webp';
}

/** One card per room type, cheapest first, so the grid stays tidy. */
function buildCards(rooms: Room[] | null): Card[] {
  if (!rooms?.length) return featured.slice(0, 3).map(toCard);
  const seen = new Map<string, Room>();
  for (const room of [...rooms].sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night))) {
    if (!seen.has(room.room_type)) seen.set(room.room_type, room);
  }
  if (!seen.size) return featured.map(toCard);
  return [...seen.values()].slice(0, 3).map((room) => ({
    type: room.room_type,
    description: room.description || 'A refined room with everything you need for a restful stay.',
    price: room.price_per_night,
    capacity: room.capacity,
    bedCount: room.bed_count,
    bedType: room.bed_type,
    image: room.image_url || roomImage(room),
    amenities: [
      ...(room.has_wifi ? ['Wi-Fi'] : []),
      ...(room.breakfast_included ? ['Breakfast'] : []),
      ...(room.special_amenities
        ? room.special_amenities
            .split(',')
            .map((item: string) => item.trim())
            .filter(Boolean)
            .slice(0, 2)
        : []),
    ],
  }));
}

function toCard(room: (typeof featured)[number]): Card {
  return {
    type: room.room_type,
    description: room.description,
    price: room.price_per_night,
    capacity: room.capacity,
    bedCount: room.bed_count,
    bedType: room.bed_type,
    image: room.image,
    amenities: ['Wi-Fi', 'Breakfast'],
  };
}

/** Reveals sections once as they scroll into view. */
function useReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.lp-reveal'));
    if (!items.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px' },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

export function Landing() {
  const rooms = useQuery<{ rooms: Room[] }>('/hotel/rooms?guests=1');
  const settings = useQuery<{ settings: Settings }>('/restaurant/settings');
  const { hash } = useLocation();
  useReveal();

  // Navbar links point at #rooms / #restaurant / #contact — scroll once mounted.
  useEffect(() => {
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const cards = useMemo(() => buildCards(rooms.data?.rooms ?? null), [rooms.data]);
  const openHours = settings.data?.settings;

  return (
    <div className="bg-[#f6f2ea] text-[#1b1a17]" id="top">
      <LandingNav />

      {/* ---------------- hero ---------------- */}
      <section className="relative flex min-h-screen items-end overflow-hidden bg-[#16211b] text-[#f6f2ea]">
        <div className="absolute inset-0">
          <img
            src="/images/landing/hero-1920.webp"
            srcSet="/images/landing/hero-800.webp 800w, /images/landing/hero-1280.webp 1280w, /images/landing/hero-1920.webp 1920w"
            sizes="100vw"
            alt="A suite at LA Illustrada with a terrace overlooking the city"
            fetchPriority="high"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#16211b]/90 via-[#16211b]/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-[1280px] px-12 pb-[100px] pt-[180px] max-[900px]:px-[22px] max-[900px]:pb-[88px] max-[640px]:pt-[140px]">
          <div className="max-w-[680px]">
            <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[.26em] text-[#e6d6b8]">Tagaytay Ridge · Est. 1998</span>
            <h1>
              Quiet luxury above <em>the ridge</em>
            </h1>
            <p className="max-w-[580px] text-[16px] leading-[1.75] text-[#f6f2ea]/80">
              {HOTEL_NAME} is a boutique hotel and restaurant where warm Filipino hospitality meets
              considered, contemporary comfort. Rooms that open to the garden, and a table that is
              always yours.
            </p>
            <div className="flex flex-wrap gap-3.5 max-[640px]:[&>a]:w-full">
              <Link className="bg-[#b08d57] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.16em] text-white no-underline" to="/rooms">
                Find a Room <ArrowRight size={15} />
              </Link>
              <Link className="border border-[#f6f2ea]/60 px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#f6f2ea] no-underline" to="/dining">
                Book a Table
              </Link>
            </div>
            <dl className="mt-14 flex max-w-[560px] flex-wrap gap-x-[34px] gap-y-4 border-t border-white/20 pt-[26px]">
              <div>
                <dt>{rooms.data?.rooms.length ? `${rooms.data.rooms.length}` : '6'}</dt>
                <dd>Rooms &amp; suites</dd>
              </div>
              <div>
                <dt>3 PM</dt>
                <dd>Check-in</dd>
              </div>
              <div>
                <dt>
                  {openHours
                    ? `${openHours.opening_time.slice(0, 5)}–${openHours.closing_time.slice(0, 5)}`
                    : '08:00–22:00'}
                </dt>
                <dd>Restaurant hours</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="lp-scroll-cue" aria-hidden="true">
          <span />
          Scroll
        </div>
      </section>

      {/* ---------------- rooms ---------------- */}
      <section className="bg-[#f6f2ea] px-0 py-[110px] max-[900px]:py-[76px]" id="rooms">
        <div className="mx-auto max-w-[1280px] px-12 max-[900px]:px-[22px]">
          <div className="mb-14 flex items-end justify-between gap-8 max-[640px]:mb-9 max-[640px]:flex-col max-[640px]:items-start">
            <div>
              <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[.24em] text-[#b08d57]">Accommodation</span>
              <h2 className="font-serif text-[42px] font-normal leading-[1.1] tracking-[-.02em] max-[640px]:text-[34px]">Rooms designed for slow mornings</h2>
            </div>
            <Link className="border-b border-[#b08d57] pb-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[#625b51] no-underline" to="/rooms">
              View all rooms
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-[30px] max-[1080px]:grid-cols-2 max-[640px]:grid-cols-1">
            {cards.map((card, index) => (
              <article
                className="flex flex-col border border-[#ded6c9] bg-white transition hover:-translate-y-1.5 hover:border-[#b08d57]/50 hover:shadow-[0_22px_44px_rgba(27,26,23,.12)]"
                key={card.type}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <figure className="relative aspect-[4/3] overflow-hidden bg-[#eee5d8]">
                  <img src={card.image} alt={`${card.type} at LA Illustrada`} loading="lazy" />
                  <figcaption className="absolute bottom-0 left-0 bg-[#16211b]/90 px-[15px] py-2 text-[10px] uppercase tracking-[.18em] text-white">{card.type}</figcaption>
                </figure>
                <div className="flex flex-1 flex-col p-[26px] pb-7">
                  <h3 className="font-serif text-[23px] font-normal">{card.type}</h3>
                  <p className="mb-5 flex-1 text-[13.5px] leading-[1.65] text-[#625b51]">{card.description}</p>
                  <div className="mb-5 flex flex-wrap gap-x-4 gap-y-[7px] border-t border-[#ded6c9] pt-4 text-[11.5px] text-[#625b51]">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} /> {card.capacity} guests
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble size={13} /> {card.bedCount} {card.bedType}
                    </span>
                    {card.amenities.includes('Wi-Fi') && (
                      <span className="inline-flex items-center gap-1.5">
                        <Wifi size={13} /> Wi-Fi
                      </span>
                    )}
                    {card.amenities.includes('Breakfast') && (
                      <span className="inline-flex items-center gap-1.5">
                        <Coffee size={13} /> Breakfast
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <span className="flex flex-col gap-0.5">
                      <strong className="font-serif text-[21px] font-normal">{money(card.price)}</strong>
                      <small className="text-[10px] uppercase tracking-[.16em] text-[#625b51]">per night</small>
                    </span>
                    <Link className="border-b border-[#b08d57] pb-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[#625b51] no-underline" to="/rooms">
                      Reserve
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-[34px] text-[12.5px] text-[#625b51]">
            Rates are per night. Deluxe rooms and suites include breakfast; Standard rooms do not.
            Availability and final pricing are confirmed when you book.
          </p>
        </div>
      </section>

      {/* ---------------- restaurant ---------------- */}
      <section className="relative overflow-hidden bg-[#16211b] px-0 py-[110px] text-[#f6f2ea] max-[900px]:py-[76px]" id="restaurant">
        <div className="relative mx-auto grid max-w-[1280px] grid-cols-[1.05fr_1fr] items-center gap-[76px] px-12 max-[900px]:grid-cols-1 max-[900px]:gap-[52px] max-[900px]:px-[22px]">
          <div>
            <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[.24em] text-[#e6d6b8]">The Restaurant</span>
            <h2 className="font-serif text-[46px] font-normal leading-[1.1] max-[640px]:text-[34px]">Farm-to-table dining, garden-side</h2>
            <p className="max-w-[470px] text-[15px] leading-[1.8] text-[#f6f2ea]/75">
              Our kitchen cooks with what the season gives us — highland vegetables, herbs from the
              terrace, and fish brought in each morning. Breakfast, lunch, and dinner are served in a
              light-filled room that opens onto the garden.
            </p>
            <ul className="my-[30px] grid max-w-[470px] list-none gap-0 p-0">
              <li className="flex items-baseline justify-between gap-5 border-b border-white/15 py-3.5 text-[13.5px] first:border-t">
                <b>Breakfast</b>
                <span>Daily · 6:30 – 10:30</span>
              </li>
              <li className="flex items-baseline justify-between gap-5 border-b border-white/15 py-3.5 text-[13.5px]">
                <b>Lunch</b>
                <span>Daily · 11:30 – 14:30</span>
              </li>
              <li className="flex items-baseline justify-between gap-5 border-b border-white/15 py-3.5 text-[13.5px]">
                <b>Dinner</b>
                <span>Daily · 18:00 – 22:00</span>
              </li>
              <li className="flex items-baseline justify-between gap-5 border-b border-white/15 py-3.5 text-[13.5px]">
                <b>Dress</b>
                <span>Smart casual</span>
              </li>
            </ul>
            <Link className="inline-flex items-center gap-2 bg-[#d8c3a0] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#16211b] no-underline" to="/dining">
              Book a Table <UtensilsCrossed size={15} />
            </Link>
          </div>
          <figure className="relative order-2 aspect-[5/6] overflow-hidden max-[900px]:aspect-[4/3]">
            <img
              src="/images/landing/dining-1280.webp"
              alt="The LA Illustrada restaurant, set with white linen beside garden windows"
              loading="lazy"
            />
            <span className="lp-dining-frame" aria-hidden="true" />
          </figure>
        </div>
      </section>

      {/* ---------------- contact ---------------- */}
      <section className="bg-[#eee5d8] px-0 py-[110px] max-[900px]:py-[76px]" id="contact">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[1fr_1.05fr] items-start gap-[72px] px-12 max-[900px]:grid-cols-1 max-[900px]:gap-[52px] max-[900px]:px-[22px]">
          <div className="lp-reveal">
            <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[.24em] text-[#b08d57]">Contact Us</span>
            <h2 className="font-serif text-[42px] font-normal leading-[1.1] tracking-[-.02em] max-[640px]:text-[34px]">We would love to hear from you</h2>
            <dl className="mt-[34px] grid">
              <div className="grid grid-cols-[124px_1fr] gap-5 border-b border-[#ded6c9] py-[19px] first:border-t max-[640px]:grid-cols-1 max-[640px]:gap-1">
                <dt>Address</dt>
                <dd>88 Illustrada Avenue, Tagaytay Ridge, Cavite 4120</dd>
              </div>
              <div className="grid grid-cols-[124px_1fr] gap-5 border-b border-[#ded6c9] py-[19px] max-[640px]:grid-cols-1 max-[640px]:gap-1">
                <dt>Phone</dt>
                <dd>
                  <a href="tel:+639175550142">+63 917 555 0142</a>
                </dd>
              </div>
              <div className="grid grid-cols-[124px_1fr] gap-5 border-b border-[#ded6c9] py-[19px] max-[640px]:grid-cols-1 max-[640px]:gap-1">
                <dt>Email</dt>
                <dd>
                  <a href="mailto:stay@lailustrada.example">stay@lailustrada.example</a>
                </dd>
              </div>
              <div className="grid grid-cols-[124px_1fr] gap-5 border-b border-[#ded6c9] py-[19px] max-[640px]:grid-cols-1 max-[640px]:gap-1">
                <dt>Front desk</dt>
                <dd>Open 24 hours, every day</dd>
              </div>
            </dl>
          </div>

          <div className="border border-[#ded6c9] bg-white px-10 py-11 max-[900px]:px-[26px]">
            <h3>Plan your visit</h3>
            <p>
              Booking takes about two minutes. Sign in with your account, choose your dates, and
              you will have a confirmation reference right away.
            </p>
            <div className="mb-[30px] grid">
              <div className="flex items-center gap-4 border-t border-[#ded6c9] py-4">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#b08d57]">
                  <BedDouble size={17} />
                </span>
                <div>
                  <b>Reserve a room</b>
                  <span>Search live availability and nightly rates</span>
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-[#ded6c9] py-4 last:border-b">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#b08d57]">
                  <CalendarCheck size={17} />
                </span>
                <div>
                  <b>Reserve a table</b>
                  <span>Lunch and dinner, every day of the week</span>
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-[#ded6c9] py-4 last:border-b">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#b08d57]">
                  <MessageCircle size={17} />
                </span>
                <div>
                  <b>Ask the concierge</b>
                  <span>Use the chat button at the corner of this page</span>
                </div>
              </div>
            </div>
            <Link className="inline-flex items-center gap-2 bg-[#16211b] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.16em] text-white no-underline" to="/rooms">
              Start a Booking <ArrowRight size={15} />
            </Link>
            <p className="lp-contact-note">
              New here? <Link to="/register">Create an account</Link> first, or{' '}
              <Link to="/login">sign in</Link> if you already have one.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="bg-[#101912] px-0 pt-[76px] text-[#f6f2ea]/70">
        <div className="mx-auto max-w-[1280px] px-12 max-[900px]:px-[22px]">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-14 pb-[60px] max-[900px]:grid-cols-1 max-[900px]:gap-[38px] max-[900px]:pb-11">
            <div>
              <span className="lp-brand">
                <span className="lp-brand-mark">LA Illustrada</span>
                <span className="lp-brand-sub">Hotel &amp; Restaurant</span>
              </span>
              <p className="lp-footer-blurb">
                A boutique hotel and restaurant on the Tagaytay ridge, welcoming guests since 1998.
              </p>
            </div>
            <div className="lp-footer-col">
              <h4>Explore</h4>
              <ul>
                <li>
                  <Link to="/rooms">Rooms &amp; suites</Link>
                </li>
                <li>
                  <Link to="/dining">Restaurant</Link>
                </li>
                <li>
                  <Link to="/">Contact us</Link>
                </li>
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Guest access</h4>
              <ul>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/register">Create account</Link>
                </li>
                <li>
                  <Link to="/reservations">My reservations</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/10 py-[26px] pb-[30px] text-[11.5px] text-white/45">
            <span>© 2026 LA Illustrada Hotel &amp; Restaurant</span>
            <span>
              <MapPin size={12} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> Tagaytay
              Ridge, Cavite
              <Clock size={12} aria-hidden="true" style={{ margin: '0 0 0 14px', verticalAlign: '-1px' }} />{' '}
              Front desk 24 hours
            </span>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}

export default Landing;
