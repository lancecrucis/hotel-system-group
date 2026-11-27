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
    <Link to="/" className="flex shrink-0 items-center no-underline" aria-label="LA Illustrada Hotel and Restaurant, home">
      <img className={compact ? 'w-[145px]' : 'w-[170px]'} src="/images/login%20elements/logo%20title%20white%20navbar.png" alt="LA Illustrada Hotel" />
    </Link>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 h-[93px] bg-[url('/images/login%20elements/navbar%20bg.png')] bg-[length:auto_100%] bg-center bg-no-repeat text-[#f3e1c7]">
        <div className="mx-auto flex h-full max-w-[1210px] items-center justify-between gap-[clamp(1rem,3vw,2rem)] px-[clamp(1rem,3vw,2rem)]">
          <div className="flex min-w-0 items-center gap-4">
            <Brand />
            <div className="flex items-center gap-3 max-[1000px]:hidden">
              <Link className="bg-[#b08d57] px-5 py-[11px] font-serif text-[16px] font-bold uppercase text-[#fff8ee] no-underline transition hover:bg-[#9a7848]" to="/rooms">
                Book Now
              </Link>
              <Link className="font-serif text-[15px] font-bold uppercase text-[#f3e1c7] no-underline transition hover:text-white" to="/login">
                Login
              </Link>
              <Link className="font-serif text-[15px] font-bold uppercase text-[#f3e1c7] no-underline transition hover:text-white" to="/register">
                Sign Up
              </Link>
            </div>
          </div>
          <nav className="flex items-center gap-[clamp(1rem,3.2vw,3.25rem)] max-[1000px]:hidden" aria-label="Landing navigation">
            {links.map((link) => (
              <Link key={link.label} className="whitespace-nowrap font-serif text-[17px] font-bold uppercase text-[#f3e1c7] transition hover:text-white" to={`${link.to}${link.hash}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="hidden min-h-11 items-center justify-center border-0 bg-transparent p-2 text-[#f3e1c7] hover:bg-white/10 max-[1000px]:inline-flex"
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 top-[93px] z-40 max-h-[calc(100vh-93px)] overflow-y-auto border-t border-white/15 bg-[#1e2d4a] px-[clamp(1rem,5vw,2rem)] pb-7 pt-3 shadow-[0_20px_40px_rgba(27,26,23,.22)]" hidden={!open}>
        <nav className="mb-[22px] grid" aria-label="Mobile navigation">
          {links.map((link) => (
          <Link className="border-b border-white/20 py-[17px] font-serif text-[17px] font-bold uppercase text-[#f3e1c7] no-underline" key={link.label} to={`${link.to}${link.hash}`} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="grid gap-2.5">
          <Link className="w-full bg-[#b08d57] px-5 py-3.5 text-center font-serif text-[15px] font-bold uppercase text-white no-underline" to="/rooms" onClick={() => setOpen(false)}>
            Book Now
          </Link>
          <Link className="w-full border border-white/40 px-5 py-3.5 text-center font-serif text-[15px] font-bold uppercase text-[#f3e1c7] no-underline hover:bg-white/10" to="/login" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link className="w-full border border-white/40 px-5 py-3.5 text-center font-serif text-[15px] font-bold uppercase text-[#f3e1c7] no-underline hover:bg-white/10" to="/register" onClick={() => setOpen(false)}>
            Sign Up
          </Link>
        </div>
      </div>
    </>
  );
}
