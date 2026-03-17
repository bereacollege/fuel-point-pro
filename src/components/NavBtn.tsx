import React from 'react';
import { cn } from '@/lib/utils';

interface NavBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function NavBtn({ active, onClick, icon, label }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-card shadow-sm text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
