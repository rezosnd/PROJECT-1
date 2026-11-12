import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useSidebarStore } from '../../lib/ui/sidebar-store';
import {
  Home,
  Search,
  Activity,
  ClipboardList,
  ShieldCheck,
  User,
  BedDouble,
  Users,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Clock,
  Droplets,
  Sparkles,
} from 'lucide-react';
import { BrandMark } from '../brand/BrandMark';

/** Use ElementType so Lucide icons type-check under tsc -b on Vercel */
type NavItem = { to: string; label: string; icon: React.ElementType };

export const Navigation: React.FC = () => {
  const { user } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const location = useLocation();
  const role = user?.role;
  const isHospital = role === 'HOSPITAL_STAFF' || role === 'HOSPITAL_ADMIN';
  const isCityAdmin = role === 'CITY_ADMIN';

  const patientItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/results', label: 'Find Beds', icon: Search },
    { to: '/blood', label: 'Blood Bank', icon: Droplets },
    { to: '/ai', label: 'CityHealth AI', icon: Sparkles },
    { to: '/doctors', label: 'Top Doctors', icon: Stethoscope },
    { to: '/equipment', label: 'Equipment', icon: Activity },
    { to: '/requests', label: 'My Requests', icon: ClipboardList },
  ];

  const hospitalItems: NavItem[] = [
    { to: '/hospital', label: 'Ward Dashboard', icon: BedDouble },
    { to: '/hospital?tab=queue', label: 'Bed Queue', icon: ClipboardList },
    { to: '/hospital?tab=blood', label: 'Blood Bank', icon: Droplets },
    { to: '/hospital?tab=blood-queue', label: 'Blood Desk', icon: Droplets },
    { to: '/hospital?tab=equipment', label: 'Equipment', icon: Stethoscope },
    ...(role === 'HOSPITAL_ADMIN'
      ? ([{ to: '/hospital?tab=staff', label: 'Staff Access', icon: Users }] as NavItem[])
      : []),
  ];

  const adminItems: NavItem[] = [{ to: '/admin', label: 'City Command', icon: ShieldCheck }];

  const navItems = isCityAdmin ? adminItems : isHospital ? hospitalItems : patientItems;

  /** Mobile app parity: Home · Hospitals · Equipment · Requests · Profile */
  const mobileTabs: NavItem[] = isCityAdmin
    ? adminItems.slice(0, 5)
    : isHospital
      ? [
          { to: '/hospital', label: 'Home', icon: Home },
          { to: '/hospital?tab=queue', label: 'Beds', icon: ClipboardList },
          { to: '/hospital?tab=blood-queue', label: 'Blood', icon: Droplets },
          { to: '/profile', label: 'Profile', icon: User },
        ]
      : [
          { to: '/', label: 'Home', icon: Home },
          { to: '/results', label: 'Hospitals', icon: Building2 },
          { to: '/blood', label: 'Blood', icon: Droplets },
          { to: '/ai', label: 'AI', icon: Sparkles },
          { to: '/requests', label: 'Requests', icon: Clock },
          { to: '/profile', label: 'Profile', icon: User },
        ];

  const isItemActive = (item: NavItem, isActive: boolean) => {
    const [pathOnly, query = ''] = item.to.split('?');
    if (!item.to.includes('?')) {
      if (item.to === '/results') {
        return location.pathname === '/results' || location.pathname.startsWith('/hospitals/');
      }
      if (item.to === '/ai') {
        return location.pathname === '/ai';
      }
      return isActive;
    }
    const qsMatch =
      !query || new URLSearchParams(location.search).toString() === query;
    return location.pathname === pathOnly && qsMatch;
  };

  const renderDesktopLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/' || item.to === '/hospital' || item.to === '/admin'}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `ll-nav-item ${isItemActive(item, isActive) ? 'll-nav-item-active' : ''}`
        }
      >
        {({ isActive }) => {
          const active = isItemActive(item, isActive);
          return (
            <>
              <Icon
                className="ll-nav-icon"
                strokeWidth={active ? 2.45 : 2.15}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </>
          );
        }}
      </NavLink>
    );
  };

  const renderMobileTab = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/' || item.to === '/hospital'}
        className="flex flex-1 flex-col items-center justify-center relative h-12 min-w-0"
      >
        {({ isActive }) => {
          const active = isItemActive(item, isActive);
          return (
            <>
              <Icon
                className={`w-6 h-6 ${active ? 'text-ink' : 'text-slate-400'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={`text-[10px] mt-0.5 truncate max-w-[64px] ${
                  active ? 'text-ink font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[var(--color-brand-lime)]" />
              )}
            </>
          );
        }}
      </NavLink>
    );
  };

  const railWidth = collapsed ? 100 : 268;

  return (
    <>
      {/* Spacer keeps main content offset while sidebar is fixed */}
      <div
        className="hidden lg:block shrink-0 transition-[width] duration-300 ease-out"
        style={{ width: railWidth }}
        aria-hidden
      />

      {/* Desktop sidebar — fixed so it never scrolls with the page */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 z-40 h-[100dvh] p-3 sm:p-4 transition-[width] duration-300 ease-out"
        style={{ width: railWidth }}
      >
        <div
          className={`ll-panel flex flex-col p-3 overflow-hidden relative h-full ${
            collapsed ? 'll-nav-collapsed' : ''
          }`}
        >
          <div
            className={`flex items-center mb-4 shrink-0 ${
              collapsed ? 'justify-center flex-col gap-3' : 'justify-between gap-2'
            }`}
          >
            <Link
              to={isCityAdmin ? '/admin' : isHospital ? '/hospital' : '/'}
              className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : 'px-1'}`}
            >
              {collapsed ? (
                <BrandMark variant="mark" markClassName="w-10 h-10" />
              ) : (
                <BrandMark variant="wordmark" showTagline markClassName="w-10 h-10" />
              )}
            </Link>

            <button
              type="button"
              onClick={toggle}
              className="w-12 h-12 rounded-2xl ll-glass border border-white/60 flex items-center justify-center text-muted hover:text-ink hover:bg-white/70 transition cursor-pointer shrink-0"
              aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
              title={collapsed ? 'Open menu' : 'Close menu'}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-[22px] h-[22px]" />
              ) : (
                <PanelLeftClose className="w-[22px] h-[22px]" />
              )}
            </button>
          </div>

          <nav className="ll-nav-list flex-1 overflow-hidden" aria-label="Primary">
            {navItems.map(renderDesktopLink)}
          </nav>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="App tabs"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 ll-glass-strong border-t border-white/50 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {mobileTabs.map(renderMobileTab)}
        </div>
      </nav>
    </>
  );
};
