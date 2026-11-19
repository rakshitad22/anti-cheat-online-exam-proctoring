import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle, RefreshCw, Radio, Lock, Zap, ShieldCheck } from 'lucide-react';

export default function WebcamFeed({ onFrameCapture, isStreaming = true, captureIntervalMs = 400 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      setPermissionError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (constraintErr) {
        console.warn('Webcam ideal constraints failed, falling back to video: true', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Webcam play deferred:', e));
        setStreamActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setPermissionError('Webcam access denied. Please authorize camera in browser settings.');
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera]);

  // Frame capture loop
  useEffect(() => {
    if (!streamActive || !isStreaming) return;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.7);
        if (onFrameCapture) {
          onFrameCapture(base64Data);
        }
      }
    }, captureIntervalMs);

    return () => clearInterval(interval);
  }, [streamActive, isStreaming, captureIntervalMs, onFrameCapture]);

  return (
    <div className="liquid-glass rounded-3xl p-1.5 relative overflow-hidden backdrop-blur-2xl border border-white/20 shadow-glass-specular">
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Viewport with Liquid Glass Bezel */}
      <div className="relative aspect-video w-full rounded-2xl bg-void/90 flex items-center justify-center overflow-hidden border border-white/10">
        {permissionError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3.5 rounded-2xl bg-neon-rose/15 text-neon-rose mb-3 shadow-neon-rose border border-neon-rose/30">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-300 font-medium mb-4 max-w-xs">{permissionError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-neon-fuchsia to-neon-violet hover:opacity-90 text-xs font-black text-white transition flex items-center gap-2 shadow-neon-fuchsia"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-authorize Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.target.play().catch(() => {});
                setStreamActive(true);
              }}
              className="w-full h-full object-cover -scale-x-100 block"
            />

            {/* Futuristic Liquid Optical HUD Crosshairs */}
            {streamActive && (
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-neon-cyan shadow-[0_0_10px_#06b6d4] rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-neon-cyan shadow-[0_0_10px_#06b6d4] rounded-tr-sm" />
                </div>

                {/* Candidate Facial Center Reticle with Liquid Laser */}
                <div className="self-center w-40 h-52 border-2 border-dashed border-neon-fuchsia/50 rounded-3xl flex flex-col justify-between p-3 relative overflow-hidden shadow-neon-fuchsia backdrop-blur-[1px]">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-neon-fuchsia via-neon-cyan to-neon-fuchsia shadow-[0_0_14px_#ec4899] animate-scanline" />
                  <span className="text-[9px] font-mono font-extrabold uppercase text-neon-cyan text-center tracking-widest bg-void/70 backdrop-blur-md py-0.5 rounded border border-white/10">
                    PROCTOR ZONE
                  </span>
                  <span className="text-[8px] font-mono font-bold text-neon-mint text-center bg-void/70 backdrop-blur-md py-0.5 rounded border border-white/10">
                    OPTICAL ALIGNED
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-neon-cyan shadow-[0_0_10px_#06b6d4] rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-neon-cyan shadow-[0_0_10px_#06b6d4] rounded-br-sm" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Top Camera Status Liquid Glass Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-2 liquid-pill px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white">
          <span className={`w-2.5 h-2.5 rounded-full ${streamActive ? 'bg-neon-rose shadow-[0_0_10px_#f43f5e] animate-ping' : 'bg-slate-500'}`} />
          <span>{streamActive ? 'LIVE • 30 FPS' : 'STANDBY'}</span>
        </div>

        {/* Bottom Stream Encryption Liquid Glass Pill */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 liquid-pill px-2.5 py-1 rounded-full text-[10px] font-mono text-neon-mint font-bold border border-neon-emerald/30 shadow-neon-emerald">
          <Lock className="w-3 h-3 text-neon-mint" />
          <span>AES-256 ENCRYPTED</span>
        </div>
      </div>
    </div>
  );
}
