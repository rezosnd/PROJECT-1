import React from 'react';
import { useLocation } from 'react-router-dom';

/** Soft enter animation on route (and hospital tab query) changes */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const key = `${location.pathname}${location.search}`;

  return (
    <div key={key} className="ll-page-enter">
      {children}
    </div>
  );
};
