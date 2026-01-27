
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ImageIcon, RefreshCw, ChevronRight, Loader2, AlertTriangle, CheckCircle2, Upload } from 'lucide-react';

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
  }, [facingMode, step]);

  const startCamera = async () => {
    stopCamera();
    try {
      const constraints = {
        video: { 
          width: { ideal: 1080 }, 
          height: { ideal: 1920 }, 
          facingMode: { ideal: facingMode } 
        },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (e: any) {
      console.error("Erro câmera:", e);
      setError("A câmera parece estar ocupada por outro app ou permissão negada.");
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

  const compressImage = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1080;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((result) => resolve(result || blob), 'image/jpeg', 0.8);
        URL.revokeObjectURL(img.src);
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ progress: 10, stage: 'Processando...' });
    
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setCaptureMode(type);

    if (type === 'image') {
      const compressed = await compressImage(file);
      setMediaBlob(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setStep('finalize');
    } else {
      setMediaBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('edit');
    }
    setUploadStatus(null);
    stopCamera();
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const options = { 
      mimeType,
      videoBitsPerSecond: 1500000 
    };
    
    const recorder = new MediaRecorder(streamRef.current, options);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: options.mimeType });
      setMediaBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setStep('edit');
    };
    recorder.start();
    setIsRecording(true);
    setDuration(0);
    timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    stopCamera();
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
      canvas.toBlob(async (blob) => {
        if (blob) {
          setUploadStatus({ progress: 10, stage: 'Otimizando...' });
          const compressed = await compressImage(blob);
          setMediaBlob(compressed);
          setPreviewUrl(URL.createObjectURL(compressed));
          setStep('finalize');
          setUploadStatus(null);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handlePost = async () => {
    if (!mediaBlob) return;
    setUploadStatus({ progress: 0, stage: 'Iniciando...' });
    try {
      await onPost(mediaBlob, captureMode, caption, (p, s) => {
        setUploadStatus({ progress: p, stage: s });
      });
      setUploadStatus({ progress: 100, stage: 'Sucesso!' });
    } catch (err: any) {
      setError(err.message || "Erro desconhecido no upload.");
      setUploadStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" min="0" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      
      {uploadStatus && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 z-[110]">
          <div className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_10px_#3b82f6]" style={{ width: `${uploadStatus.progress}%` }} />
          <div className="absolute top-4 left-0 right-0 text-center">
             <span className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-[0.2em] border border-white/10">
                {uploadStatus.stage} {uploadStatus.progress}%
             </span>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"><X size={24} /></button>
        {isRecording && (
          <div className="bg-red-600 px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            00:{duration.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-zinc-950 m-2 rounded-[2.5rem] overflow-hidden border border-white/5 flex items-center justify-center">
        {error && step === 'capture' && (
          <div className="absolute inset-0 z-40 bg-zinc-900 flex flex-col items-center justify-center p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
               <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
               <p className="text-white font-black uppercase tracking-widest text-xs">Atenção</p>
               <p className="text-zinc-500 text-[10px] leading-relaxed uppercase font-bold max-w-xs">{error}</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
            >
              <Upload size={16}/> Escolher da Galeria
            </button>
            <button onClick={startCamera} className="text-zinc-500 text-[9px] font-black uppercase tracking-widest underline">Tentar de novo</button>
          </div>
        )}

        {step === 'capture' && !error && (
          <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
        )}
        {(step === 'edit' || step === 'finalize') && (
          captureMode === 'video' ? (
            <video src={previewUrl!} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={previewUrl!} className="w-full h-full object-cover" alt="Preview" />
          )
        )}
      </div>

      <div className="p-8 pb-12 bg-black">
        {step === 'capture' && (
          <div className="flex flex-col items-center gap-8">
            <div className="flex bg-zinc-900 p-1 rounded-full border border-white/5">
               <button onClick={() => setCaptureMode('video')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${captureMode === 'video' ? 'bg-white text-black' : 'text-zinc-500'}`}>Vídeo</button>
               <button onClick={() => setCaptureMode('image')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${captureMode === 'image' ? 'bg-white text-black' : 'text-zinc-500'}`}>Foto</button>
            </div>
            <div className="flex items-center justify-around w-full">
               <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 w-12 h-12 flex items-center justify-center bg-zinc-900 rounded-xl">
                  <ImageIcon size={24}/>
               </button>
               <button 
                  onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)}
                  disabled={!!error && !mediaBlob}
                  className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-600' : 'border-white'} flex items-center justify-center transition-all active:scale-90 disabled:opacity-20`}
                >
                  <div className={`transition-all ${isRecording ? 'w-8 h-8 bg-red-600 rounded-md' : 'w-16 h-16 bg-white rounded-full'}`} />
               </button>
               <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="text-zinc-500 w-12 h-12 flex items-center justify-center bg-zinc-900 rounded-xl">
                  <RefreshCw size={24}/>
               </button>
            </div>
          </div>
        )}

        {step === 'edit' && (
          <button onClick={() => setStep('finalize')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
            Avançar <ChevronRight size={18}/>
          </button>
        )}

        {step === 'finalize' && (
          <div className="space-y-4">
             <textarea 
                placeholder="Legenda profissional..."
                className="w-full bg-zinc-900 rounded-2xl p-4 text-white text-sm h-24 outline-none border border-white/5 focus:border-blue-500 transition-colors"
                value={caption}
                onChange={e => setCaption(e.target.value)}
             />
             <button 
                onClick={handlePost} 
                disabled={!!uploadStatus}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl active:scale-95 transition-all"
             >
                {uploadStatus ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> PUBLICAR AGORA</>}
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
