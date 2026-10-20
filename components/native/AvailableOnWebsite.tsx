'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { openExternalUrl } from '@/lib/native/browser';

interface AvailableOnWebsiteProps {
  className?: string;
  url?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function AvailableOnWebsite({
  className = '',
  url,
  size = 'md',
  fullWidth = false,
}: AvailableOnWebsiteProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const destination = url || (typeof window !== 'undefined' ? window.location.href : '/');
    openExternalUrl(destination);
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 min-h-[36px]',
    md: 'text-xs sm:text-sm px-3.5 py-2 min-h-[44px]',
    lg: 'text-sm sm:text-base px-5 py-3 min-h-[48px]',
  }[size];

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="available-on-website-btn"
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-indigo-600/30 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer shadow-xs active:scale-98 ${sizeClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      aria-label="Available on our website"
    >
      <span>Available on our website</span>
      <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
    </button>
  );
}

export default AvailableOnWebsite;
