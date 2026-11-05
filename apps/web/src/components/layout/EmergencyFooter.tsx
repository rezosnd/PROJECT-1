import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneCall, AlertCircle } from 'lucide-react';

export const EmergencyFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="Emergency Assistance Advisory"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-hairline/80 px-4 py-2.5 shadow-float flex items-center justify-between text-xs"
    >
      <div className="flex items-center gap-2 max-w-xl">
        <div className="w-6 h-6 rounded-full bg-red-light text-red flex items-center justify-center shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
        <p className="text-muted leading-tight truncate">
          <span className="font-semibold text-ink mr-1.5">{t('emergency.strip')}</span>
          <span className="hidden sm:inline">({t('emergency.disclaimer')})</span>
        </p>
      </div>

      <a
        href="tel:112"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red text-white font-bold rounded-pill shadow-xs hover:bg-red/90 transition-all active:scale-95 shrink-0"
      >
        <PhoneCall className="w-3.5 h-3.5" />
        <span>112</span>
      </a>
    </aside>
  );
};

