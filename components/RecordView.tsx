import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ImageIcon, RefreshCw, ChevronRight, Loader2, AlertTriangle, Upload, Zap, Settings, Maximize2, Camera as CameraIcon, ZapOff } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image', caption: string, onProgress: (p: number, stage: string) => void, thumbnail?: Blob) => Promise<void>;
}

const RecordView: React.FC<RecordViewProps> = ({ onCancel, onPost }) => {
  const [step, setStep] = useState<'capture' | 'edit' | 'finalize'>('capture');
  const [captureMode, setCaptureMode] = useState<'video' | 'image'>('video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{ progress: number, stage: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashLevel, setFlashLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [quality, setQuality] = useState<'ultra' | 'high' | 'balanced'>('balanced'); // Default to Balanced (720p)

  const qualityConfig = {
    ultra: { width: 3840, height: 2160, bitrate: 8000000 },
    high: { width: 1920, height: 1080, bitrate: 4000000 },
    balanced: { width: 1280, height: 720, bitrate: 2000000 }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateThumbnail = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) setThumbnailBlob(blob);
        }, 'image/jpeg', 0.7);
      }
    }
  };

  useEffect(() => {
    if (step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [facingMode, step, quality]);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;

    if (capabilities.torch) {
      const newLevel = flashLevel === 0 ? 1 : 0;
      try {
        await track.applyConstraints({
          advanced: [{ torch: newLevel === 1 }] as any
        });
        setFlashLevel(newLevel);
      } catch (err) {
        console.error("Flash error:", err);
      }
    }
  };

  const startCamera = async () => {
    setIsInitializing(true);
    stopCamera();

    // Pequeno delay para garantir que o React renderizou o elemento video
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const constraintsList = [
        { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true },
        { video: { facingMode: { ideal: facingMode } }, audio: true },
        { video: true, audio: true }
      ];

      let stream = null;
      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (e) {
          console.warn("Constraint failed:", e);
        }
      }

      if (stream && videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        await new Promise((resolve) => {
          if (!videoRef.current) return resolve(null);
          videoRef.current.onloadedmetadata = () => resolve(null);
        });

        await videoRef.current.play();
        setError(null);
      } else if (!stream) {
        throw new Error("Não foi possível acessar nenhuma câmera.");
      }
    } catch (e: any) {
      console.error("Critical:", e);
      setError("Erro ao abrir câmera: " + (e.message || "Erro desconhecido"));
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
    else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) mimeType = 'video/webm;codecs=h264';
    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';

    const options = {
      mimeType,
      videoBitsPerSecond: qualityConfig[quality].bitrate,
      audioBitsPerSecond: 192000
    };

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setMediaBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setStep('edit');
      };
      recorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error(err);
      setError("Erro ao iniciar gravação.");
    }
  };

  const stopRecording = () => {
    generateThumbnail();
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setMediaBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          setStep('finalize');
        }
      }, 'image/jpeg', 0.95);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden h-full w-full" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const type = file.type.startsWith('video') ? 'video' : 'image';
          setCaptureMode(type);
          setMediaBlob(file);
          setPreviewUrl(URL.createObjectURL(file));
          setStep(type === 'video' ? 'edit' : 'finalize');
        }
      }} />

      {isInitializing && !error && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Iniciando Hardware...</p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-zinc-900 w-full max-w-xs rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-wider">Qualidade</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500"><X /></button>
            </div>
            <div className="flex flex-col gap-2">
              {(['balanced', 'high', 'ultra'] as const).map((q) => (
                <button key={q} onClick={() => { setQuality(q); setShowSettings(false); }} className={`p-4 rounded-xl text-left border transition-all ${quality === q ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/20 border-white/5 text-zinc-400'}`}>
                  <span className="block font-bold capitalize">{q === 'balanced' ? 'Suave (720p)' : q === 'high' ? 'Alta (1080p)' : 'Ultra (4K)'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-[60] pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-zinc-900/90 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 pointer-events-auto active:scale-90 shadow-2xl">
          <X size={24} />
        </button>
        {isRecording && (
          <div className="bg-red-600 px-5 py-2 rounded-full text-white text-[12px] font-black tracking-widest flex items-center gap-2 animate-pulse shadow-xl border border-white/20">
            <div className="w-2.5 h-2.5 bg-white rounded-full" />
            00:{duration.toString().padStart(2, '0')}
          </div>
        )}
        <div className="flex gap-3 pointer-events-auto">
          {facingMode === 'environment' && (
            <button onClick={toggleFlash} className={`w-12 h-12 rounded-2xl backdrop-blur-xl flex items-center justify-center border border-white/10 transition-all ${flashLevel > 0 ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'bg-zinc-900/90 text-white'}`}>
              <Zap size={22} className={flashLevel > 0 ? 'fill-current' : ''} />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-2xl bg-zinc-900/90 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 active:scale-90 shadow-2xl">
            <Settings size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {step === 'capture' ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center text-center p-10 space-y-6 z-10 w-full max-w-sm">
                <AlertTriangle size={40} className="text-red-500" />
                <p className="text-zinc-500 text-xs font-medium leading-relaxed">{error}</p>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={() => { setError(null); startCamera(); }} className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black text-[11px] uppercase active:scale-95">Tentar Novamente</button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-zinc-900 text-zinc-400 rounded-[1.8rem] border border-white/5 font-black text-[11px] uppercase active:scale-95">Usar Galeria</button>
                </div>
              </div>
            ) : (
              <video
                key={facingMode}
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full bg-zinc-900 relative flex items-center justify-center">
            {captureMode === 'video' ? (
              <video src={previewUrl!} autoPlay loop playsInline className="max-w-full max-h-full rounded-[2.5rem] shadow-2xl" />
            ) : (
              <img src={previewUrl!} className="max-w-full max-h-full rounded-[2.5rem] shadow-2xl" />
            )}
            <button onClick={() => { setStep('capture'); setPreviewUrl(null); }} className="absolute top-8 left-8 z-[70] w-12 h-12 bg-black/60 backdrop-blur-xl rounded-2xl text-white flex items-center justify-center border border-white/10"><X /></button>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/95 backdrop-blur-3xl pt-10 px-8 flex flex-col items-center gap-8 shrink-0 z-50 w-full relative" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)' }}>
        {step === 'capture' ? (
          <>
            <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
              <button onClick={() => setCaptureMode('video')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'video' ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500'}`}>Vídeo</button>
              <button onClick={() => setCaptureMode('image')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'image' ? 'bg-white text-black shadow-lg scale-105' : 'text-zinc-500'}`}>Foto</button>
            </div>

            <div className="flex items-center justify-between w-full max-w-sm">
              <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 border border-white/10 active:scale-90"><ImageIcon size={26} /></button>
              <div className="relative">
                <div className={`absolute -inset-4 rounded-full border-2 border-white/20 transition-all ${isRecording ? 'scale-125 opacity-100 animate-ping' : 'opacity-40'}`} />
                <button
                  onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)}
                  className="relative w-24 h-24 rounded-full border-4 border-white flex items-center justify-center active:scale-90 z-10"
                >
                  <div className={`transition-all duration-500 ${isRecording ? 'w-10 h-10 bg-red-600 rounded-2xl' : captureMode === 'video' ? 'w-20 h-20 bg-red-600 rounded-full' : 'w-20 h-20 bg-white rounded-full'}`} />
                </button>
              </div>
              <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 border border-white/10 active:scale-90"><RefreshCw size={26} /></button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md animate-in slide-in-from-bottom-6 duration-500">
            <div className="bg-black/60 backdrop-blur-3xl border border-white/10 p-2 rounded-[2.5rem] shadow-2xl flex items-center gap-3">
              <textarea
                placeholder="Legenda da sua publicação..."
                className="flex-1 bg-transparent text-white text-sm h-14 py-4 px-6 outline-none resize-none placeholder:text-zinc-600 font-medium"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
              <button
                disabled={!!uploadStatus}
                onClick={async () => {
                  setUploadStatus({ progress: 10, stage: 'Publicando...' });
                  await onPost(mediaBlob!, captureMode, caption, (p, s) => setUploadStatus({ progress: p, stage: s }), thumbnailBlob);
                  onCancel();
                }}
                className="w-14 h-14 bg-blue-600 rounded-[1.4rem] text-white shadow-xl shadow-blue-600/30 flex items-center justify-center disabled:opacity-50"
              >
                {uploadStatus ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} className="ml-1" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
