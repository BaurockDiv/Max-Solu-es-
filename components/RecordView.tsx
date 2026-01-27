
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ImageIcon, RefreshCw, ChevronRight, Loader2, AlertTriangle, Upload, Zap, Settings, Maximize2, Camera as CameraIcon } from 'lucide-react';

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
          aspectRatio: { ideal: 9 / 16 },
          width: { ideal: 2160 },
          height: { ideal: 3840 },
          facingMode: { ideal: facingMode },
          frameRate: { ideal: 60 }
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
    const options = {
      mimeType: MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ? 'video/mp4;codecs=h264' : 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000 // 8Mbps para qualidade profissional
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
      }, 'image/jpeg', 0.98);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col font-sans overflow-hidden">
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

      {/* Interface Superior Estilo Samsung */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50">
        <button onClick={onCancel} className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"><X size={24} /></button>
        {isRecording && (
          <div className="bg-red-600 px-4 py-1.5 rounded-full text-white text-[10px] font-black tracking-widest flex items-center gap-2 animate-pulse shadow-xl">
            <div className="w-2 h-2 bg-white rounded-full" />
            00:{duration.toString().padStart(2, '0')}
          </div>
        )}
        <div className="flex gap-4">
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"><Zap size={20} /></button>
          <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"><Settings size={20} /></button>
        </div>
      </div>

      {/* Preview da Câmera */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
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
          </>
        ) : (
          <div className="w-full h-full">
            {captureMode === 'video' ? (
              <video src={previewUrl!} autoPlay loop playsInline className="w-full h-full object-contain" />
            ) : (
              <img src={previewUrl!} className="w-full h-full object-contain" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Controles Inferiores */}
      <div className="bg-black px-8 pb-12 pt-6 flex flex-col items-center gap-8">
        {step === 'capture' ? (
          <>
            <div className="flex gap-10">
              <button onClick={() => setCaptureMode('video')} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all ${captureMode === 'video' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>Vídeo</button>
              <button onClick={() => setCaptureMode('image')} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all ${captureMode === 'image' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>Foto</button>
            </div>

            <div className="flex items-center justify-between w-full">
              <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 border border-white/5"><ImageIcon size={24} /></button>

              <button
                onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all p-1"
              >
                <div className={`transition-all duration-300 ${isRecording ? 'w-8 h-8 bg-red-600 rounded-lg' : captureMode === 'video' ? 'w-16 h-16 bg-red-600 rounded-full' : 'w-16 h-16 bg-white rounded-full'}`} />
              </button>

              <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 border border-white/5"><RefreshCw size={24} /></button>
            </div>
          </>
        ) : (
          <div className="w-full space-y-6">
            <textarea
              placeholder="Escreva sua legenda..."
              className="w-full bg-zinc-900 rounded-3xl p-5 text-white text-sm h-28 outline-none border border-white/5 focus:border-blue-600 transition-all resize-none"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setStep('capture')} className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center text-white border border-white/5"><RefreshCw size={24} /></button>
              <button
                onClick={async () => {
                  setUploadStatus({ progress: 10, stage: 'Publicando...' });
                  await onPost(mediaBlob!, captureMode, caption, (p, s) => setUploadStatus({ progress: p, stage: s }));
                  onCancel();
                }}
                className="flex-1 h-16 bg-blue-600 rounded-3xl text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {uploadStatus ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                {uploadStatus ? 'Sincronizando...' : 'Publicar Agora'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
