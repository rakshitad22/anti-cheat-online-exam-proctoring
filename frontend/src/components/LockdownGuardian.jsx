import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Mic,
  Volume2,
  AlertTriangle,
  Lock,
  Radio,
  Eye,
  CheckCircle2,
  XCircle,
  Flame,
  Zap
} from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

export default function LockdownGuardian({
  isActive = false,
  testTitle = 'Proctored Examination',
  warningsCount = {},
  onViolationTriggered,
  onForceSubmit,
  maxAllowedWarnings = 5,
  allowVoice = false
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState('');

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioAnimationRef = useRef(null);
  const lastVoiceViolationTime = useRef(0);
  const consecutiveLoudFrames = useRef(0);
  const baselineNoiseRef = useRef(70);

  // 1. Enter Fullscreen Mode
  const enterFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      setShowWarningModal(false);
    } catch (err) {
      console.warn('Fullscreen request dismissed:', err);
    }
  }, []);

  // 2. Fullscreen Listener
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFull = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFull);

      if (!isCurrentlyFull && isActive) {
        triggerSecurityViolation(
          'FULLSCREEN_EXITED',
          'Candidate exited fullscreen mode! Fullscreen lockdown is strictly mandatory.'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    enterFullscreen();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isActive, enterFullscreen]);

  // 3. Tab Switch & Window Blur Detection
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSecurityViolation(
          'TAB_SWITCH_DETECTED',
          'Tab switch or minimized window detected! Switching tabs is strictly prohibited.'
        );
      }
    };

    const handleWindowBlur = () => {
      triggerSecurityViolation(
        'TAB_SWITCH_DETECTED',
        'Window lost focus (Alt+Tab, window blur, or multi-screen interaction).'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive]);

  // 4. Anti-Copy-Paste, Right Click & Hotkey Blocker
  useEffect(() => {
    if (!isActive) return;

    const blockContextMenu = (e) => e.preventDefault();

    const blockKeystrokes = (e) => {
      // Allow spacebar if interview or normal typing
      if (e.key === 'F11' || e.key === 'F12') {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p', 's', 'u', 'r'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        triggerSecurityViolation('HOTKEY_BLOCKED', `Prohibited key shortcut detected (Ctrl+${e.key.toUpperCase()}).`);
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        triggerSecurityViolation('TAB_SWITCH_DETECTED', 'Alt+Tab task switching attempted!');
      }
    };

    const blockCopy = (e) => {
      e.preventDefault();
      triggerSecurityViolation('COPY_PASTE_ATTEMPT', 'Clipboard copy action prohibited.');
    };

    const blockPaste = (e) => {
      e.preventDefault();
      triggerSecurityViolation('COPY_PASTE_ATTEMPT', 'Clipboard paste action prohibited.');
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockKeystrokes);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('paste', blockPaste);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeystrokes);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('paste', blockPaste);
    };
  }, [isActive]);

  // 5. Microphone Audio & Voice Activity Detection (VAD)
  useEffect(() => {
    if (!isActive || allowVoice) return;

    const initMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (allowVoice) {
            setVoiceDetected(false);
            setAudioLevel(0);
            return;
          }
          analyser.getByteFrequencyData(dataArray);

          // Vocal Formant Bandpass Filter (350 Hz to 3400 Hz):
          // Bins 0-1 (0-375 Hz): Mechanical fan hum, laptop whirr, AC rumble -> STRICTLY PERMITTED & FILTERED OUT!
          // Bins 2-18 (375-3400 Hz): Human vocal speech & conversational commotion band.
          let speechSum = 0;
          let speechBins = 0;
          for (let i = 2; i <= Math.min(18, dataArray.length - 1); i++) {
            speechSum += dataArray[i];
            speechBins++;
          }
          const speechAvg = speechBins > 0 ? speechSum / speechBins : 0;

          // Adaptive Ambient Baseline Calibration:
          // Continuously track steady background room noise (fan, computer electrical hiss, room acoustics)
          if (speechAvg < baselineNoiseRef.current + 20) {
            baselineNoiseRef.current = baselineNoiseRef.current * 0.97 + speechAvg * 0.03;
          }

          // Calibrated Decibel Meter for UI Display:
          // In a quiet room, displays a calm 20 - 28 dB (Quiet Exam Hall / Green).
          const dynamicDb = Math.max(
            18,
            Math.min(95, Math.round(20 + Math.max(0, speechAvg - baselineNoiseRef.current) * 1.6))
          );
          setAudioLevel(dynamicDb);

          // Robust Human Voice / Loud Commotion Discriminator:
          // Requires genuine human speech (energy > 135 out of 255 AND +35 dB above ambient room noise floor).
          // Low fan noises, laptop fans, breathing, keyboard tapping are completely ignored!
          const isTrueSpeech = speechAvg > 135 && speechAvg > (baselineNoiseRef.current + 35);

          if (isTrueSpeech) {
            consecutiveLoudFrames.current += 1;
            // Must be sustained for ~1.5 to 2.0 seconds (~45 frames at 60fps) of continuous talking
            if (consecutiveLoudFrames.current >= 45) {
              setVoiceDetected(true);
              const now = Date.now();
              if (now - lastVoiceViolationTime.current > 20000) {
                lastVoiceViolationTime.current = now;
                triggerSecurityViolation(
                  'VOICE_DETECTED',
                  'Audible human speech or severe background noise detected in examination room! Silent environment required.'
                );
              }
            }
          } else {
            consecutiveLoudFrames.current = Math.max(0, consecutiveLoudFrames.current - 2);
            if (consecutiveLoudFrames.current <= 5) {
              setVoiceDetected(false);
            }
          }

          audioAnimationRef.current = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      } catch (err) {
        console.warn('Microphone lockdown access:', err);
      }
    };

    initMicrophone();

    return () => {
      if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isActive, allowVoice]);

  // 6. Security Violation Trigger
  const triggerSecurityViolation = async (violationType, message) => {
    try {
      await axios.post(`${API_BASE_URL}/api/proctor/log-warning`, {
        type: violationType,
        message: message,
        timestamp: Date.now() / 1000
      });
    } catch (err) {
      console.warn('Failed to log violation remotely:', err);
    }

    setWarningModalMessage(message);
    setShowWarningModal(true);

    if (onViolationTriggered) {
      onViolationTriggered(violationType, message);
    }

    const currentStrikes = (warningsCount?.total || 0) + 1;
    if (currentStrikes >= maxAllowedWarnings && onForceSubmit) {
      onForceSubmit();
    }
  };

  const totalWarnings = warningsCount?.total || 0;

  return (
    <>
      {/* Liquid Glass Cockpit Lockdown Top HUD Bar */}
      <div className="liquid-glass border-b border-white/20 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-0 z-30 backdrop-blur-3xl shadow-glass-specular">
        
        {/* Left Security Pill Droplet */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl liquid-pill bg-gradient-to-r from-neon-rose/25 via-neon-orange/20 to-neon-fuchsia/25 text-neon-rose border border-neon-rose/40 font-black font-mono shadow-neon-rose">
            <Radio className="w-3.5 h-3.5 text-neon-rose animate-pulse" />
            <span>ACTIVE SECURITY LOCKDOWN</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-200 font-mono text-[11px]">
            <span className="text-neon-cyan drop-shadow-[0_0_6px_#06b6d4]">• Focus Locked</span>
            <span className="text-neon-amber drop-shadow-[0_0_6px_#f59e0b]">• Acoustic VAD</span>
            <span className="text-neon-mint drop-shadow-[0_0_6px_#00f59b]">• Anti-Paste Active</span>
          </div>
        </div>

        {/* Right Audio Equalizer & Warnings Counter */}
        <div className="flex items-center gap-3">
          
          {/* Multi-Color Audio Equalizer Liquid Pill */}
          {!allowVoice && (
            <div className="flex items-center gap-2.5 liquid-pill px-3.5 py-1.5 rounded-2xl border border-white/15">
              <Volume2 className={`w-3.5 h-3.5 ${voiceDetected ? 'text-neon-rose animate-ping' : 'text-neon-cyan'}`} />
              
              {/* Dynamic Equalizer Bars */}
              <div className="flex items-end gap-1 h-3.5 w-14">
                {[40, 70, 30, 90, 60, 20].map((h, i) => {
                  const barHeight = Math.max(15, Math.min(100, (audioLevel / 50) * h));
                  const colors = ['#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'];
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-full transition-all duration-75 shadow-sm"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: audioLevel > 38 ? '#f43f5e' : colors[i]
                      }}
                    />
                  );
                })}
              </div>

              <span className="text-[10px] font-mono font-bold text-neon-mint">{audioLevel} dB</span>
            </div>
          )}

          {/* 5 Security Shields Warning Counter Liquid Pill */}
          <div className="flex items-center gap-2.5 liquid-pill px-3.5 py-1.5 rounded-2xl border border-white/15">
            <span className="text-neon-amber font-mono font-bold text-[11px]">Strikes:</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: maxAllowedWarnings }).map((_, idx) => {
                const isViolated = idx < totalWarnings;
                return (
                  <span
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isViolated
                        ? 'bg-neon-rose shadow-neon-rose ring-2 ring-neon-rose/50 animate-pulse'
                        : 'bg-white/20'
                    }`}
                  />
                );
              })}
            </div>
            <span className={`font-mono font-black text-xs ${totalWarnings >= 3 ? 'text-neon-rose' : 'text-neon-gold'}`}>
              {totalWarnings}/{maxAllowedWarnings}
            </span>
          </div>

          {/* Fullscreen Restore Button */}
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-neon-fuchsia to-neon-orange hover:opacity-90 text-white font-black text-[11px] flex items-center gap-1.5 shadow-neon-fuchsia animate-bounce font-mono"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Re-enter Fullscreen
            </button>
          )}
        </div>
      </div>

      {/* Red Alert Breach Warning Modal with Liquid Glass */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-3xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl liquid-glass border-2 border-neon-rose/70 p-7 shadow-neon-rose text-center overflow-hidden">
            
            {/* Top Multi-Color Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold" />

            <div className="inline-flex p-4 rounded-2xl bg-neon-rose/20 text-neon-rose mb-4 animate-bounce shadow-neon-rose border border-neon-rose/40">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2 font-mono">
              {warningModalMessage.toLowerCase().includes('phone') ? '📱 Mobile Phone Detected' : 'Security Violation Detected'}
            </h3>
            <p className="text-xs text-rose-200 leading-relaxed mb-5 font-medium">
              {warningModalMessage}
            </p>

            <div className="p-3.5 mb-6 rounded-2xl liquid-glass-subtle border border-neon-rose/40 text-xs flex items-center justify-between font-mono">
              <span className="text-slate-300">Total Infractions:</span>
              <span className="font-black text-neon-rose text-sm">{totalWarnings} of {maxAllowedWarnings}</span>
            </div>

            <button
              onClick={() => {
                setShowWarningModal(false);
                if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-neon-rose via-neon-orange to-neon-gold hover:opacity-90 text-white font-black text-xs shadow-neon-rose transition flex items-center justify-center gap-2 uppercase tracking-wider font-mono active:scale-95"
            >
              {warningModalMessage.toLowerCase().includes('phone') ? (
                <span>📱 I Have Kept Phone Aside • Resume Exam</span>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Acknowledge & Resume Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
