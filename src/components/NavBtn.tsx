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
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150',
        active
          ? 'bg-card shadow-sm text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon} {label}
    </button>
  );
}
