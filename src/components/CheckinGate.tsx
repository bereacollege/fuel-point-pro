import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useCheckin } from '@/hooks/useCheckin';
import { toast } from '@/hooks/use-toast';

interface CheckinGateProps {
  children: React.ReactNode;
}

export function CheckinGate({ children }: CheckinGateProps) {
  const { checkedIn, loading, submitCheckin } = useCheckin();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  if (checkedIn) return <>{children}</>;

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
      setStreaming(true);
    } catch {
      toast({ title: 'Camera Error', description: 'Please allow camera access.', variant: 'destructive' });
    }
  };

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'checkin.jpg', { type: 'image/jpeg' });
      const { error } = await submitCheckin(file);
      if (error) {
        toast({ title: 'Check-in Failed', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Checked In!', description: 'You can now use the POS system.' });
        stream?.getTracks().forEach(t => t.stop());
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
      <div className="surface-card p-6 w-full max-w-sm text-center space-y-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Camera size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold heading-tight">Daily Check-in</h2>
        <p className="text-sm text-muted-foreground">
          Take a live photo to confirm you're at the office before using the system.
        </p>

        <video
          ref={videoRef}
          className={`w-full rounded-xl bg-secondary aspect-[4/3] object-cover ${streaming ? '' : 'hidden'}`}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming ? (
          <button
            onClick={startCamera}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Camera size={18} /> Open Camera
          </button>
        ) : (
          <button
            onClick={capture}
            disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Camera size={18} /> Take Photo & Check In</>}
          </button>
        )}
      </div>
    </div>
  );
}
