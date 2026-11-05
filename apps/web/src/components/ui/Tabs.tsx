import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'segmented';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap gap-1.5 p-1.5 rounded-[22px] ll-glass border border-white/55 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center gap-2 h-11 px-4 text-xs font-bold rounded-2xl transition-all duration-200 select-none ${
              isActive
                ? 'bg-[var(--color-brand-forest)]/90 text-[var(--color-brand-lime)] border border-white/15 shadow-[0_8px_20px_rgba(11,61,26,0.18)]'
                : 'text-muted hover:text-ink hover:bg-white/55 border border-transparent'
            }`}
          >
            {tab.icon && <span className="inline-flex shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold inline-flex items-center justify-center ${
                  isActive
                    ? 'bg-[var(--color-brand-lime)] text-[var(--color-brand-forest)]'
                    : 'bg-hairline text-muted'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
