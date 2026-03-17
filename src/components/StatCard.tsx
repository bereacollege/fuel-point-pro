import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'primary' | 'danger' | 'success';
}

const variantClasses = {
  default: 'text-foreground',
  primary: 'text-primary',
  danger: 'text-destructive',
  success: 'text-accent',
};

export function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <div className="surface-card p-6">
      <p className="label-caps mb-1">{label}</p>
      <p className={cn('text-2xl font-black font-mono-value', variantClasses[variant])}>
        {value}
      </p>
    </div>
  );
}
