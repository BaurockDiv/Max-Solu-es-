
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, ImageIcon, Check, Maximize, Move, SlidersHorizontal, RefreshCw, Scissors, Play, Pause, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image', caption: string) => void;
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Edição
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const editVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (step === 'capture') startCamera();
    return () => stopCamera();
  }, [facingMode, step]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    
    const constraints = {
      video: { 
        width: { ideal: 1080 }, 
        height: { ideal: 1920 },
        facingMode: { ideal: facingMode }, 
        frameRate: { ideal: 30 } 
      },
      audio: true
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      setError("Permissão de câmera negada ou dispositivo em uso.");
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
    
    try {
      const options = {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 
                  MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '',
        videoBitsPerSecond: 2500000 // Reduzido para 2.5Mbps para melhor estabilidade de upload móvel
      };

      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        const url = URL.createObjectURL(blob);
        setMediaBlob(blob);
        setPreviewUrl(url);
        setStep('edit');
        setIsRecording(false);
      };
      recorder.start(1000); // Coleta dados a cada segundo para evitar perda em crash
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      setError("Falha ao iniciar gravador de mídia.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const takePhoto = () => {
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
        canvas.toBlob((blob) => {
          if (blob) {
            setMediaBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setStep('finalize');
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const processTrim = async () => {
    if (captureMode === 'image') {
        setStep('finalize');
        return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('finalize');
    }, 1200);
  };

  const handlePost = async () => {
    if (mediaBlob) {
      setIsPublishing(true);
      try {
        await onPost(mediaBlob, captureMode, caption);
      } catch (err: any) {
        alert("Erro no upload: " + err.message);
        setIsPublishing(false);
      }
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-[110] flex flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-600/10 flex items-center justify-center text-red-600">
           <AlertTriangle size={40} />
        </div>
        <p className="text-white font-black uppercase tracking-widest text-sm leading-relaxed">{error}</p>
        <button onClick={onCancel} className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col transition-colors duration-500 overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50">
        <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
          <X size={24} />
        </button>
        {isRecording && (
          <div className="bg-red-600 px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            00:{duration.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="flex-1 relative bg-zinc-950 m-2 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        {step === 'capture' && (
          <video 
            ref={videoRef} 
            autoPlay muted playsInline 
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
        {step === 'edit' && (
          <video 
            ref={editVideoRef}
            src={previewUrl!}
            autoPlay loop
            onLoadedMetadata={(e) => {
              setVideoDuration(e.currentTarget.duration);
              setTrimEnd(e.currentTarget.duration);
            }}
            className="w-full h-full object-contain bg-black"
          />
        )}
        {step === 'finalize' && (
          <div className="h-full w-full flex flex-col p-8 space-y-6 justify-center">
             <div className="aspect-[9/16] w-40 mx-auto rounded-[1.8rem] overflow-hidden border-4 border-white/10 shadow-2xl bg-black">
                {captureMode === 'video' ? (
                   <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
                ) : (
                   <img src={previewUrl!} className="w-full h-full object-cover" />
                )}
             </div>
             <textarea 
                placeholder="Legenda para converter em negócios..."
                className="w-full bg-zinc-900/80 rounded-[1.5rem] p-5 text-white text-sm h-32 outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                value={caption}
                onChange={e => setCaption(e.target.value)}
             />
          </div>
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
               <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 w-12 h-12 flex items-center justify-center"><ImageIcon size={28}/></button>
               <button 
                  onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)}
                  className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-600' : 'border-white'} flex items-center justify-center active:scale-90 transition-transform`}
                >
                  <div className={`transition-all ${isRecording ? 'w-8 h-8 bg-red-600 rounded-md' : 'w-16 h-16 bg-white rounded-full'}`} />
               </button>
               <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="text-zinc-500 w-12 h-12 flex items-center justify-center"><RefreshCw size={28}/></button>
            </div>
          </div>
        )}

        {step === 'edit' && (
          <div className="space-y-6">
             <div className="flex gap-4">
                <button onClick={() => setStep('capture')} className="flex-1 py-5 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Descartar</button>
                <button onClick={processTrim} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                   {isProcessing ? <Loader2 className="animate-spin"/> : <>Avançar <ChevronRight size={18}/></>}
                </button>
             </div>
          </div>
        )}

        {step === 'finalize' && (
           <div className="flex gap-4">
              <button onClick={() => setStep(captureMode === 'video' ? 'edit' : 'capture')} className="px-8 py-5 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Voltar</button>
              <button onClick={handlePost} disabled={isPublishing} className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-green-600/10">
                 {isPublishing ? <Loader2 className="animate-spin"/> : <><Send size={18}/> PUBLICAR NO BIZSTREAM</>}
              </button>
           </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          setCaptureMode(type);
          setMediaBlob(file);
          setPreviewUrl(URL.createObjectURL(file));
          setStep(type === 'video' ? 'edit' : 'finalize');
          stopCamera();
        }
      }} />
    </div>
  );
};

export default RecordView;
