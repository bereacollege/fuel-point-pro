import React, { useRef, useState } from 'react';
import { Camera, Loader2, KeyRound } from 'lucide-react';
import { useCheckin } from '@/hooks/useCheckin';
import { supabase } from '@/integrations/supabase/client';
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
  const [photoTaken, setPhotoTaken] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'checkin.jpg', { type: 'image/jpeg' });
      setPendingFile(file);
      setPhotoTaken(true);
      stream?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.8);
  };

  const verifyAndCheckin = async () => {
    if (pinCode.length !== 4 || !pendingFile) return;
    setVerifyingPin(true);

    const { data: codes } = await supabase
      .from('cashier_codes')
      .select('*')
      .eq('code', pinCode)
      .eq('active', true)
      .limit(1);

    if (!codes || codes.length === 0) {
      toast({ title: 'Invalid Code', description: 'This cashier code is not active.', variant: 'destructive' });
      setVerifyingPin(false);
      return;
    }

    const { error } = await submitCheckin(pendingFile);
    if (error) {
      toast({ title: 'Check-in Failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Checked In!', description: 'You can now use the POS system.' });
    }
    setVerifyingPin(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
      <div className="surface-card p-6 w-full max-w-sm text-center space-y-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          {photoTaken ? <KeyRound size={28} className="text-primary" /> : <Camera size={28} className="text-primary" />}
        </div>
        <h2 className="text-xl font-bold heading-tight">
          {photoTaken ? 'Enter Cashier Code' : 'Daily Check-in'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {photoTaken
            ? 'Enter your 4-digit cashier code to proceed.'
            : 'Take a live photo to confirm you\'re at the office before using the system.'}
        </p>

        {!photoTaken && (
          <>
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
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Camera size={18} /> Take Photo
              </button>
            )}
          </>
        )}

        {photoTaken && (
          <>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="● ● ● ●"
              className="w-full h-14 bg-secondary rounded-xl text-center text-2xl font-mono-value tracking-[0.5em] outline-none focus:ring-2 ring-primary transition-all"
            />
            <button
              onClick={verifyAndCheckin}
              disabled={pinCode.length !== 4 || verifyingPin}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {verifyingPin ? <Loader2 className="animate-spin" size={18} /> : <><KeyRound size={18} /> Verify & Check In</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
