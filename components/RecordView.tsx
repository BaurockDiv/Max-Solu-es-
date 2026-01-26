
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Send, ImageIcon, Check, Maximize, Move, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image', caption: string) => void;
}

const RecordView: React.FC<RecordViewProps> = ({ onCancel, onPost }) => {
  const [captureMode, setCaptureMode] = useState<'video' | 'image'>('video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  
  // Etapas: 'capture' -> 'adjust' (apenas foto) -> 'finalize'
  const [step, setStep] = useState<'capture' | 'adjust' | 'finalize'>('capture');
  
  // Estados de Ajuste (Enquadramento)
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  
  const [isPublishing, setIsPublishing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, aspectRatio: 9/16 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera solicitada.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
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
          ctx.scale(-1, 1); // Mirror apenas para frontal
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            setMediaBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setStep('adjust');
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setMediaBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setStep('finalize');
    };
    recorder.start();
    setIsRecording(true);
    setDuration(0);
    timerRef.current = window.setInterval(() => setDuration(p => p + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePost = async () => {
    if (mediaBlob && !isPublishing) {
      setIsPublishing(true);
      await onPost(mediaBlob, captureMode, caption);
    }
  };

  const renderCaptureControls = () => (
    <div className="flex flex-col items-center space-y-8 w-full">
      {/* Mode Selector */}
      <div className="flex items-center bg-zinc-900/50 backdrop-blur-xl p-1 rounded-full border border-white/5">
        <button 
          onClick={() => setCaptureMode('video')}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'video' ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
        >
          Vídeo
        </button>
        <button 
          onClick={() => setCaptureMode('image')}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${captureMode === 'image' ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
        >
          Foto
        </button>
      </div>

      {/* Main Action Area */}
      <div className="flex items-center justify-around w-full max-w-sm">
        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-zinc-500 hover:text-white transition-colors">
          <ImageIcon size={26} />
          <span className="text-[8px] mt-1 uppercase font-black tracking-tighter">Upload</span>
        </button>

        <button 
          onClick={captureMode === 'image' ? takePhoto : (isRecording ? stopRecording : startRecording)} 
          className={`w-24 h-24 rounded-full border-4 ${isRecording ? 'border-red-600' : 'border-white/20'} flex items-center justify-center transition-all active:scale-90 group relative`}
        >
            <div className={`transition-all duration-300 ${isRecording ? 'w-10 h-10 bg-red-600 rounded-lg' : captureMode === 'image' ? 'w-18 h-18 bg-white rounded-full' : 'w-18 h-18 bg-white/10 rounded-full border-4 border-white'}`}>
               {!isRecording && captureMode === 'video' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 bg-red-600 rounded-full" /></div>}
            </div>
        </button>

        <div className="flex flex-col gap-4">
          <button onClick={toggleCamera} className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-white transition-all active:rotate-180 duration-500">
            <RefreshCw size={22} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdjustControls = () => (
    <div className="w-full space-y-8">
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">
          <div className="flex items-center gap-2"><Maximize size={14}/> Zoom</div>
          <span className="text-blue-500">{Math.round(zoom * 100)}%</span>
        </div>
        <input 
          type="range" min="1" max="3" step="0.1" 
          value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        
        <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 pt-2">
          <div className="flex items-center gap-2"><Move size={14}/> Posição Vertical</div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setOffsetY(o => o - 10)} className="flex-1 py-4 bg-zinc-900 rounded-2xl flex items-center justify-center text-white active:bg-zinc-800 transition-colors"><SlidersHorizontal className="rotate-90" size={20}/></button>
           <button onClick={() => setOffsetY(o => o + 10)} className="flex-1 py-4 bg-zinc-900 rounded-2xl flex items-center justify-center text-white active:bg-zinc-800 transition-colors"><SlidersHorizontal className="-rotate-90" size={20}/></button>
           <button onClick={() => { setZoom(1); setOffsetY(0); }} className="px-6 py-4 bg-zinc-800 rounded-2xl text-[10px] font-black text-zinc-400">RESET</button>
        </div>
      </div>

      <div className="flex space-x-4 px-2">
        <button onClick={() => {setPreviewUrl(null); startCamera(); setStep('capture');}} className="flex-1 py-5 bg-zinc-900 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest">Descartar</button>
        <button onClick={() => setStep('finalize')} className="flex-1 py-5 bg-blue-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
           Avançar <Check size={18}/>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden transition-colors duration-500">
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          setCaptureMode(type);
          setMediaBlob(file);
          setPreviewUrl(URL.createObjectURL(file));
          stopCamera();
          setStep(type === 'image' ? 'adjust' : 'finalize');
        }
      }} />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50">
        <button onClick={onCancel} className="w-12 h-12 rounded-[1.2rem] bg-black/40 backdrop-blur-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all">
          <X size={24} />
        </button>
        {isRecording && (
          <div className="bg-red-600 px-6 py-2.5 rounded-full text-white text-[10px] font-black tracking-widest animate-pulse uppercase flex items-center gap-2 shadow-lg">
             <div className="w-2 h-2 bg-white rounded-full animate-ping" />
             REC: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Viewport Principal */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden m-4 rounded-[2.5rem] shadow-2xl border border-white/5 group">
        {step === 'finalize' ? (
          <div className="h-full flex flex-col p-10 justify-center space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="aspect-[3/4] w-52 mx-auto rounded-[2.2rem] overflow-hidden border-4 border-white/10 shadow-2xl relative">
              {captureMode === 'video' ? (
                <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
              ) : (
                <img 
                  src={previewUrl!} 
                  className="w-full h-full object-cover" 
                  style={{ transform: `scale(${zoom}) translateY(${offsetY}px)` }} 
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Legenda Profissional</label>
               <textarea 
                placeholder="Ex: Novo serviço disponível! Agende agora. #negocio #profissional"
                className="w-full bg-zinc-900/50 border-none rounded-[1.8rem] p-6 text-white text-sm focus:ring-2 focus:ring-blue-500 h-36 resize-none shadow-inner placeholder:text-zinc-700"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <div className="w-full h-full relative">
                {captureMode === 'video' ? (
                  <video src={previewUrl} className="w-full h-full object-cover" autoPlay loop playsInline />
                ) : (
                  <img 
                    src={previewUrl} 
                    className="w-full h-full object-cover transition-transform duration-200" 
                    style={{ transform: `scale(${zoom}) translateY(${offsetY}px)` }}
                  />
                )}
                {step === 'adjust' && (
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                     <div className="w-full h-full border-2 border-white/20 border-dashed rounded-[1.8rem]" />
                  </div>
                )}
              </div>
            ) : (
              <video 
                ref={videoRef} 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
                autoPlay 
                muted 
                playsInline 
              />
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-10 pb-12 bg-black border-t border-white/5">
        {step === 'capture' && renderCaptureControls()}
        {step === 'adjust' && renderAdjustControls()}
        {step === 'finalize' && (
           <div className="flex space-x-4">
              <button onClick={() => setStep(captureMode === 'image' ? 'adjust' : 'capture')} className="px-8 py-5 bg-zinc-900 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Voltar</button>
              <button onClick={handlePost} disabled={isPublishing} className="flex-1 py-5 bg-green-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-500/10 active:scale-95 transition-all">
                  {isPublishing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={18}/> PUBLICAR AGORA</>}
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
