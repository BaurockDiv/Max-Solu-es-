import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ImageIcon, RefreshCw, ChevronRight, Loader2, AlertTriangle, Upload, Zap, Settings, Maximize2, Camera as CameraIcon, ZapOff } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image', caption: string, onProgress: (p: number, stage: string) => void) => Promise<void>;
}

const RecordView: React.FC<RecordViewProps> = ({ onCancel, onPost }) => {
  const [step, setStep] = useState<'capture' | 'edit' | 'finalize'>('capture');
  const [captureMode, setCaptureMode] = useState<'video' | 'image'>('video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{ progress: number, stage: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashLevel, setFlashLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<'high' | 'balanced'>('balanced'); // Default to Balanced (720p)

  const qualityConfig = {
    high: { width: 1920, height: 1080, bitrate: 2500000 },
    balanced: { width: 1280, height: 720, bitrate: 1500000 }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    stopCamera();
    const config = qualityConfig[quality];
    try {
      const constraints = {
        video: {
          aspectRatio: { ideal: 9 / 16 },
          width: { ideal: config.width },
          height: { ideal: config.height },
          facingMode: { ideal: facingMode },
          frameRate: { ideal: 30 }
        },
        audio: { echoCancellation: true, noiseSuppression: true }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback: se 4K/60fps falhar, tenta padrão
        console.warn("Retrying camera with lower constraints...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: true
        });
      }

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
    } catch (e: any) {
      console.error("Camera Error:", e);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // Deixar o navegador escolher o melhor codec nativo
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';

    const options = {
      mimeType,
      videoBitsPerSecond: qualityConfig[quality].bitrate
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
      recorder.start(1000); // Salva chunks a cada 1s para evitar perda de dados
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error(err);
      setError("Erro ao iniciar gravação. Tente reduzir a qualidade.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const takePhoto = () => {
    // ... mantendo lógica existente ...
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
    <div className="fixed inset-0 bg-black z-[200] flex flex-col font-sans" style={{ touchAction: 'none' }}>
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-zinc-900 w-full max-w-xs rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-wider">Configurações</h3>
              <button onClick={() => setShowSettings(false)}><X className="text-zinc-500" /></button>
            </div>

            <div className="space-y-2">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest pl-2">Qualidade de Vídeo</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setQuality('high'); setShowSettings(false); }} className={`p-4 rounded-xl text-left border transition-all ${quality === 'high' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/5 text-zinc-400'}`}>
                  <span className="block font-bold text-sm">Alta (1080p)</span>
                  <span className="text-[10px] opacity-60">Melhor qualidade, arquivo maior.</span>
                </button>
                <button onClick={() => { setQuality('balanced'); setShowSettings(false); }} className={`p-4 rounded-xl text-left border transition-all ${quality === 'balanced' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/5 text-zinc-400'}`}>
                  <span className="block font-bold text-sm">Suave (720p)</span>
                  <span className="text-[10px] opacity-60">Ideal para evitar travamentos.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Fixo - Safe Area */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between z-50 pointer-events-none">
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 pointer-events-auto active:scale-90 transition-all shadow-lg"><X size={20} /></button>

        {isRecording && (
          <div className="bg-red-600/90 backdrop-blur px-4 py-1.5 rounded-full text-white text-[12px] font-black tracking-widest flex items-center gap-2 animate-pulse shadow-xl">
            <div className="w-2 h-2 bg-white rounded-full" />
            00:{duration.toString().padStart(2, '0')}
          </div>
        )}

        <div className="flex gap-3 pointer-events-auto">
          {facingMode === 'environment' && (
            <button onClick={toggleFlash} className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-all ${flashLevel > 0 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-black/40 text-white'}`}>
              {flashLevel > 0 ? <Zap size={20} className="fill-current" /> : <ZapOff size={20} />}
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"><Settings size={20} /></button>
        </div>
      </div>

      {/* Área da Câmera (Flex Grow) */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {step === 'capture' ? (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                <AlertTriangle size={48} className="text-red-500 mb-2" />
                <p className="text-white font-bold text-lg">Câmera Indisponível</p>
                <p className="text-zinc-500 text-sm max-w-xs">{error}</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-4 bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest">
                  Escolher Arquivo
                </button>
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full bg-black relative">
            {captureMode === 'video' ? (
              <video src={previewUrl!} autoPlay loop playsInline className="w-full h-full object-contain" />
            ) : (
              <img src={previewUrl!} className="w-full h-full object-contain" />
            )}
            <button onClick={() => setStep('capture')} className="absolute top-4 left-4 z-50 bg-black/50 p-2 rounded-full text-white"><X /></button>
          </div>
        )}
      </div>

      {/* Rodapé de Controles (Fixo no Bottom - Safe Area) */}
      <div className="bg-black pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] px-6 flex flex-col items-center gap-6 shrink-0 z-50 w-full">
        {step === 'capture' ? (
          <>
            <div className="flex bg-zinc-900/80 p-1 rounded-full backdrop-blur-md">
              <button onClick={() => setCaptureMode('video')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'video' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'}`}>Vídeo</button>
              <button onClick={() => setCaptureMode('image')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'image' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'}`}>Foto</button>
            </div>

            <div className="flex items-center justify-between w-full max-w-sm px-4">
              <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center text-white/50 hover:bg-zinc-700/80 transition-all"><ImageIcon size={22} /></button>

              <div className="relative">
                {/* Anel Externo do Shutter */}
                <div className={`absolute inset-0 rounded-full border-4 border-white/30 ${isRecording ? 'scale-125 animate-pulse' : 'scale-100'}`} />
                <button
                  onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)}
                  className={`relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10 ${isRecording ? 'bg-transparent' : 'bg-transparent'}`}
                >
                  <div className={`transition-all duration-300 ${isRecording ? 'w-8 h-8 bg-red-500 rounded-md' : captureMode === 'video' ? 'w-16 h-16 bg-red-500 rounded-full' : 'w-16 h-16 bg-white rounded-full'}`} />
                </button>
              </div>

              <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center text-white/50 hover:bg-zinc-700/80 transition-all"><RefreshCw size={22} /></button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md space-y-4 animate-in slide-in-from-bottom duration-300">
            <textarea
              placeholder="Escreva uma legenda..."
              className="w-full bg-zinc-900/90 rounded-2xl p-4 text-white text-sm h-24 outline-none border border-white/10 focus:border-blue-500 transition-all resize-none placeholder:text-zinc-600"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                disabled={!!uploadStatus}
                onClick={async () => {
                  setUploadStatus({ progress: 10, stage: 'Publicando...' });
                  await onPost(mediaBlob!, captureMode, caption, (p, s) => setUploadStatus({ progress: p, stage: s }));
                  onCancel();
                }}
                className="flex-1 h-14 bg-blue-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
              >
                {uploadStatus ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                {uploadStatus ? 'Enviando...' : 'Publicar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
