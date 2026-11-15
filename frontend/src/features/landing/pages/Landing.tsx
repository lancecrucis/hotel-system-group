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
import { useQuery } from '@/hooks/useQuery';
import type { Room, Settings } from '@/types/models';
import { money } from '@/utils/format';
import { LandingNav } from '../components/LandingNav';
import { ChatWidget } from '../components/ChatWidget';

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
    <div className="lp-root" id="top">
      <LandingNav />

      {/* ---------------- hero ---------------- */}
      <section className="lp-hero">
        <div className="lp-hero-media">
          <img
            src="/images/landing/hero-1920.webp"
            srcSet="/images/landing/hero-800.webp 800w, /images/landing/hero-1280.webp 1280w, /images/landing/hero-1920.webp 1920w"
            sizes="100vw"
            alt="A suite at LA Illustrada with a terrace overlooking the city"
            fetchPriority="high"
          />
        </div>
        <div className="lp-hero-scrim" />
        <div className="lp-shell lp-hero-inner">
          <div className="lp-hero-content">
            <span className="lp-hero-eyebrow">Tagaytay Ridge · Est. 1998</span>
            <h1>
              Quiet luxury above <em>the ridge</em>
            </h1>
            <p className="lp-hero-copy">
              {HOTEL_NAME} is a boutique hotel and restaurant where warm Filipino hospitality meets
              considered, contemporary comfort. Rooms that open to the garden, and a table that is
              always yours.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-btn" to="/rooms">
                Find a Room <ArrowRight size={15} />
              </Link>
              <Link className="lp-btn lp-btn-outline" to="/dining">
                Book a Table
              </Link>
            </div>
            <dl className="lp-hero-meta">
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
      <section className="lp-section lp-rooms" id="rooms">
        <div className="lp-shell">
          <div className="lp-section-head lp-reveal">
            <div>
              <span className="lp-eyebrow">Accommodation</span>
              <h2 className="lp-section-title">Rooms designed for slow mornings</h2>
            </div>
            <Link className="lp-quiet-link" to="/rooms">
              View all rooms
            </Link>
          </div>

          <div className="lp-room-grid">
            {cards.map((card, index) => (
              <article
                className="lp-room-card lp-reveal"
                key={card.type}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <figure className="lp-room-figure">
                  <img src={card.image} alt={`${card.type} at LA Illustrada`} loading="lazy" />
                  <figcaption className="lp-room-tag">{card.type}</figcaption>
                </figure>
                <div className="lp-room-body">
                  <h3>{card.type}</h3>
                  <p className="lp-room-desc">{card.description}</p>
                  <div className="lp-room-facts">
                    <span>
                      <Users size={13} /> {card.capacity} guests
                    </span>
                    <span>
                      <BedDouble size={13} /> {card.bedCount} {card.bedType}
                    </span>
                    {card.amenities.includes('Wi-Fi') && (
                      <span>
                        <Wifi size={13} /> Wi-Fi
                      </span>
                    )}
                    {card.amenities.includes('Breakfast') && (
                      <span>
                        <Coffee size={13} /> Breakfast
                      </span>
                    )}
                  </div>
                  <div className="lp-room-foot">
                    <span className="lp-room-price">
                      <strong>{money(card.price)}</strong>
                      <small>per night</small>
                    </span>
                    <Link className="lp-quiet-link" to="/rooms">
                      Reserve
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="lp-rooms-note lp-reveal">
            Rates are per night. Deluxe rooms and suites include breakfast; Standard rooms do not.
            Availability and final pricing are confirmed when you book.
          </p>
        </div>
      </section>

      {/* ---------------- restaurant ---------------- */}
      <section className="lp-section lp-dining" id="restaurant">
        <div className="lp-shell lp-dining-grid">
          <div className="lp-dining-copy lp-reveal">
            <span className="lp-eyebrow">The Restaurant</span>
            <h2>Farm-to-table dining, garden-side</h2>
            <p>
              Our kitchen cooks with what the season gives us — highland vegetables, herbs from the
              terrace, and fish brought in each morning. Breakfast, lunch, and dinner are served in a
              light-filled room that opens onto the garden.
            </p>
            <ul className="lp-dining-list">
              <li>
                <b>Breakfast</b>
                <span>Daily · 6:30 – 10:30</span>
              </li>
              <li>
                <b>Lunch</b>
                <span>Daily · 11:30 – 14:30</span>
              </li>
              <li>
                <b>Dinner</b>
                <span>Daily · 18:00 – 22:00</span>
              </li>
              <li>
                <b>Dress</b>
                <span>Smart casual</span>
              </li>
            </ul>
            <Link className="lp-btn" to="/dining">
              Book a Table <UtensilsCrossed size={15} />
            </Link>
          </div>
          <figure className="lp-dining-figure lp-reveal">
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
      <section className="lp-section lp-contact" id="contact">
        <div className="lp-shell lp-contact-grid">
          <div className="lp-reveal">
            <span className="lp-eyebrow">Contact Us</span>
            <h2 className="lp-section-title">We would love to hear from you</h2>
            <dl className="lp-contact-details">
              <div className="lp-contact-row">
                <dt>Address</dt>
                <dd>88 Illustrada Avenue, Tagaytay Ridge, Cavite 4120</dd>
              </div>
              <div className="lp-contact-row">
                <dt>Phone</dt>
                <dd>
                  <a href="tel:+639175550142">+63 917 555 0142</a>
                </dd>
              </div>
              <div className="lp-contact-row">
                <dt>Email</dt>
                <dd>
                  <a href="mailto:stay@lailustrada.example">stay@lailustrada.example</a>
                </dd>
              </div>
              <div className="lp-contact-row">
                <dt>Front desk</dt>
                <dd>Open 24 hours, every day</dd>
              </div>
            </dl>
          </div>

          <div className="lp-contact-card lp-reveal">
            <h3>Plan your visit</h3>
            <p>
              Booking takes about two minutes. Sign in with your account, choose your dates, and
              you will have a confirmation reference right away.
            </p>
            <div className="lp-contact-options">
              <div className="lp-contact-option">
                <span className="lp-contact-icon">
                  <BedDouble size={17} />
                </span>
                <div>
                  <b>Reserve a room</b>
                  <span>Search live availability and nightly rates</span>
                </div>
              </div>
              <div className="lp-contact-option">
                <span className="lp-contact-icon">
                  <CalendarCheck size={17} />
                </span>
                <div>
                  <b>Reserve a table</b>
                  <span>Lunch and dinner, every day of the week</span>
                </div>
              </div>
              <div className="lp-contact-option">
                <span className="lp-contact-icon">
                  <MessageCircle size={17} />
                </span>
                <div>
                  <b>Ask the concierge</b>
                  <span>Use the chat button at the corner of this page</span>
                </div>
              </div>
            </div>
            <Link className="lp-btn lp-btn-dark" to="/rooms">
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
      <footer className="lp-footer">
        <div className="lp-shell">
          <div className="lp-footer-top">
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
          <div className="lp-footer-bottom">
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
