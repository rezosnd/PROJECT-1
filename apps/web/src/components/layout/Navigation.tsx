import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useSidebarStore } from '../../lib/ui/sidebar-store';
import {
  Home,
  Search,
  Activity,
  ClipboardList,
  CreditCard,
  ShieldCheck,
  User,
  BedDouble,
  Users,
  Stethoscope,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Clock,
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
    { to: '/doctors', label: 'Top Doctors', icon: Stethoscope },
    { to: '/equipment', label: 'Equipment', icon: Activity },
    { to: '/requests', label: 'My Requests', icon: ClipboardList },
    { to: '/abha', label: 'ABHA ID', icon: CreditCard },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const hospitalItems: NavItem[] = [
    { to: '/hospital', label: 'Ward Dashboard', icon: BedDouble },
    { to: '/hospital?tab=queue', label: 'Bed Queue', icon: ClipboardList },
    { to: '/hospital?tab=equipment', label: 'Equipment', icon: Stethoscope },
    ...(role === 'HOSPITAL_ADMIN'
      ? ([{ to: '/hospital?tab=staff', label: 'Staff Access', icon: Users }] as NavItem[])
      : []),
    { to: '/profile', label: 'Account', icon: User },
  ];

  const adminItems: NavItem[] = [
    { to: '/admin', label: 'City Command', icon: ShieldCheck },
    { to: '/profile', label: 'Account', icon: User },
  ];

  const navItems = isCityAdmin ? adminItems : isHospital ? hospitalItems : patientItems;

  /** Mobile app parity: Home · Hospitals · Equipment · Requests · Profile */
  const mobileTabs: NavItem[] = isCityAdmin
    ? adminItems.slice(0, 5)
    : isHospital
      ? [
          { to: '/hospital', label: 'Home', icon: Home },
          { to: '/hospital?tab=queue', label: 'Queue', icon: ClipboardList },
          { to: '/hospital?tab=equipment', label: 'Equip', icon: Stethoscope },
          { to: '/profile', label: 'Profile', icon: User },
        ]
      : [
          { to: '/', label: 'Home', icon: Home },
          { to: '/results', label: 'Hospitals', icon: Building2 },
          { to: '/equipment', label: 'Equipment', icon: Stethoscope },
          { to: '/requests', label: 'Requests', icon: Clock },
          { to: '/profile', label: 'Profile', icon: User },
        ];

  const isItemActive = (item: NavItem, isActive: boolean) => {
    const [pathOnly, query = ''] = item.to.split('?');
    if (!item.to.includes('?')) {
      if (item.to === '/results') {
        return location.pathname === '/results' || location.pathname.startsWith('/hospitals/');
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
          `ll-nav-item ${collapsed ? 'justify-center px-2.5' : ''} ${
            isItemActive(item, isActive) ? 'll-nav-item-active' : ''
          }`
        }
      >
        {({ isActive }) => {
          const active = isItemActive(item, isActive);
          return (
            <>
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
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
                className={`w-[22px] h-[22px] ${active ? 'text-ink' : 'text-slate-400'}`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] mt-0.5 truncate max-w-[64px] ${
                  active ? 'text-ink font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-1 h-1 rounded-full bg-blue" />
              )}
            </>
          );
        }}
      </NavLink>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col sticky top-0 h-screen p-4 transition-[width] duration-300 ease-out ${
          collapsed ? 'w-[88px]' : 'w-[260px]'
        }`}
      >
        <div className="ll-panel flex-1 flex flex-col p-3 overflow-hidden relative">
          <div className={`flex items-center mb-4 ${collapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-2'}`}>
            <Link
              to={isCityAdmin ? '/admin' : isHospital ? '/hospital' : '/'}
              className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : 'px-1'}`}
            >
              {collapsed ? (
                <BrandMark variant="mark" markClassName="w-10 h-10" />
              ) : (
                <BrandMark
                  variant="wordmark"
                  showTagline
                  markClassName="w-10 h-10"
                />
              )}
            </Link>

            <button
              type="button"
              onClick={toggle}
              className="w-9 h-9 rounded-xl bg-card-soft border border-hairline flex items-center justify-center text-muted hover:text-ink hover:bg-white transition cursor-pointer shrink-0"
              aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
              title={collapsed ? 'Open menu' : 'Close menu'}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5" aria-label="Primary">
            {navItems.map(renderDesktopLink)}
          </nav>

          {!isHospital && !isCityAdmin && !collapsed && (
            <div className="mt-3 rounded-[22px] bg-gradient-to-br from-[#111111] to-[#2A2A2A] text-white p-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-amber-400/30 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-amber-300 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">ABHA Ready</span>
                </div>
                <p className="text-sm font-semibold leading-snug mb-3">
                  Link once — photo, QR & details stay on your profile.
                </p>
                <Link
                  to="/abha"
                  className="inline-flex items-center justify-center w-full h-10 rounded-xl bg-white text-ink text-xs font-bold hover:bg-card-soft transition"
                >
                  Open ABHA
                </Link>
              </div>
            </div>
          )}

          {!isHospital && !isCityAdmin && collapsed && (
            <Link
              to="/abha"
              title="ABHA"
              className="mt-3 mx-auto w-10 h-10 rounded-xl bg-ink text-amber-300 flex items-center justify-center"
            >
              <Sparkles className="w-4 h-4" />
            </Link>
          )}

          <div className={`mt-3 pt-3 border-t border-hairline/80 ${collapsed ? 'flex justify-center' : ''}`}>
            <Link
              to="/profile"
              title="Settings"
              className={`ll-nav-item ${collapsed ? 'justify-center px-2.5' : ''}`}
            >
              <Settings className="w-[18px] h-[18px]" />
              {!collapsed && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar — matches Expo app */}
      <nav
        aria-label="App tabs"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.05)]"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {mobileTabs.map(renderMobileTab)}
        </div>
      </nav>
    </>
  );
};
