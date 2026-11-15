import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Home', to: '/', hash: '#top' },
  { label: 'Rooms', to: '/', hash: '#rooms' },
  { label: 'Restaurant', to: '/', hash: '#restaurant' },
  { label: 'Contact Us', to: '/', hash: '#contact' },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="lp-brand" aria-label="LA Illustrada Hotel and Restaurant, home">
      <span className="lp-brand-mark">LA Illustrada</span>
      {!compact && <span className="lp-brand-sub">Hotel &amp; Restaurant</span>}
    </Link>
  );
}

export function LandingNav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className={`lp-nav${solid || open ? ' is-solid' : ''}`}>
        <div className="lp-shell lp-nav-inner">
          <Brand />
          <nav className="lp-nav-links" aria-label="Landing navigation">
            {links.map((link) => (
              <Link key={link.label} className="lp-nav-link" to={`${link.to}${link.hash}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <Link className="lp-btn lp-nav-btn" to="/rooms">
              Book Now
            </Link>
            <Link className="lp-nav-ghost" to="/login">
              Login
            </Link>
            <Link className="lp-nav-ghost" to="/register">
              Sign Up
            </Link>
            <button
              className="lp-nav-toggle"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      <div className={`lp-mobile-panel${open ? ' is-open' : ''}`} hidden={!open}>
        <nav aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.label} to={`${link.to}${link.hash}`} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="lp-mobile-cta">
          <Link className="lp-btn" to="/rooms" onClick={() => setOpen(false)}>
            Book Now
          </Link>
          <Link className="lp-btn lp-btn-dark" to="/login" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link className="lp-btn lp-btn-dark" to="/register" onClick={() => setOpen(false)}>
            Sign Up
          </Link>
        </div>
      </div>
    </>
  );
}
