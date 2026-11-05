import { useState, useEffect } from 'react';

export function useElapsedTime(timestamp: Date | string | undefined): number {
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  useEffect(() => {
    if (!timestamp) return;

    const targetDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    const update = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((now.getTime() - targetDate.getTime()) / 1000));
      setSecondsAgo(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return secondsAgo;
}

