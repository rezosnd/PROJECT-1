import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useElapsedTime(date: Date | string | undefined): string {
  const { t } = useTranslation();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!date) return;

    const compute = () => {
      const past = new Date(date).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - past) / 1000));
      setSecondsAgo(diff);
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [date]);

  return t('common.updatedAgo', { count: secondsAgo, defaultValue: `Updated ${secondsAgo}s ago` });
}

