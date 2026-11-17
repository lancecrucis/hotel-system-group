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
    <Link to="/" className="flex flex-col text-[#1b1a17] no-underline" aria-label="LA Illustrada Hotel and Restaurant, home">
      <span className="font-serif text-[21px] tracking-[.08em]">LA Illustrada</span>
      {!compact && <span className="text-[9px] uppercase tracking-[.28em] text-[#8b8174]">Hotel &amp; Restaurant</span>}
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
      <header className={`fixed inset-x-0 top-0 z-50 transition ${solid || open ? 'bg-[#f6f2ea]/95 shadow-[0_8px_30px_rgba(27,26,23,.08)] backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-12 py-6 max-[900px]:px-[22px]">
          <Brand />
          <nav className="flex items-center gap-8 max-[900px]:hidden" aria-label="Landing navigation">
            {links.map((link) => (
              <Link key={link.label} className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#625b51] transition hover:text-[#b08d57]" to={`${link.to}${link.hash}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link className="rounded-sm bg-[#16211b] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#f6f2ea] no-underline transition hover:bg-[#26382d] max-[900px]:hidden" to="/rooms">
              Book Now
            </Link>
            <Link className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#625b51] no-underline max-[900px]:hidden" to="/login">
              Login
            </Link>
            <Link className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#625b51] no-underline max-[900px]:hidden" to="/register">
              Sign Up
            </Link>
            <button
              className="hidden border-0 bg-transparent p-2 text-[#1b1a17] max-[900px]:inline-flex"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 top-0 z-40 bg-[#f6f2ea] px-[22px] pb-[30px] pt-24 shadow-[0_20px_40px_rgba(27,26,23,.16)]" hidden={!open}>
        <nav className="mb-[22px] grid" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link className="border-b border-[#ded6c9] py-[17px] text-xs font-semibold uppercase tracking-[.16em] text-[#1b1a17] no-underline" key={link.label} to={`${link.to}${link.hash}`} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-2.5">
          <Link className="w-full bg-[#b08d57] px-5 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white" to="/rooms" onClick={() => setOpen(false)}>
            Book Now
          </Link>
          <Link className="w-full bg-[#16211b] px-5 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white" to="/login" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link className="w-full bg-[#16211b] px-5 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white" to="/register" onClick={() => setOpen(false)}>
            Sign Up
          </Link>
        </div>
      </div>
    </>
  );
}
