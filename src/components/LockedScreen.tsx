import { Lock } from 'lucide-react';

export function LockedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
      <div className="surface-card p-8 w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={32} className="text-destructive" />
        </div>
        <h2 className="text-xl font-bold heading-tight">System Closed</h2>
        <p className="text-sm text-muted-foreground">
          POS is unavailable between <strong>7:00 PM</strong> and <strong>7:00 AM</strong>. Contact admin for access.
        </p>
      </div>
    </div>
  );
}
