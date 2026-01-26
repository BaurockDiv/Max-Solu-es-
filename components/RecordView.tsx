
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Send, Sparkles, Zap, Image as ImageIcon } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image') => void;
}

const MAX_DURATION = 60; // seconds

const RecordView: React.FC<RecordViewProps> = ({ onCancel, onPost }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', aspectRatio: 9/16 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Acesso à câmera negado. Por favor, habilite as permissões.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setMediaBlob(blob);
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start();
    setIsRecording(true);
    setDuration(0);

    timerRef.current = window.setInterval(() => {
      setDuration(prev => {
        if (prev >= MAX_DURATION) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isVideo || isImage) {
      setMediaType(isVideo ? 'video' : 'image');
      setMediaBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    } else {
      alert("Por favor, selecione uma imagem ou vídeo válido.");
    }
  };

  const handleDiscard = () => {
    setMediaBlob(null);
    setPreviewUrl(null);
    setDuration(0);
    startCamera();
  };

  const handlePost = () => {
    if (mediaBlob) {
      onPost(mediaBlob, mediaType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      {/* Input de arquivo oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button 
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <X size={24} />
        </button>

        {isRecording && (
          <div className="flex items-center space-x-2 bg-red-600/80 px-3 py-1.5 rounded-full text-white text-xs font-bold animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span>00:{duration < 10 ? `0${duration}` : duration}</span>
          </div>
        )}

        {!previewUrl && (
          <div className="flex space-x-4">
             <button className="text-white opacity-80 hover:opacity-100 transition-opacity"><Zap size={22} /></button>
             <button className="text-white opacity-80 hover:opacity-100 transition-opacity"><Sparkles size={22} /></button>
          </div>
        )}
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 relative bg-zinc-900 overflow-hidden">
        {previewUrl ? (
          mediaType === 'video' ? (
            <video 
              src={previewUrl} 
              className="w-full h-full object-cover" 
              autoPlay 
              loop 
              playsInline 
            />
          ) : (
            <img 
              src={previewUrl} 
              className="w-full h-full object-cover" 
              alt="Preview"
            />
          )
        ) : (
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover scale-x-[-1]" 
            autoPlay 
            muted 
            playsInline 
          />
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-10 text-center">
            <p className="text-white text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
            <div 
              className="h-full bg-red-600 transition-all duration-1000 ease-linear" 
              style={{ width: `${(duration / MAX_DURATION) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-10 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col items-center">
        {!previewUrl ? (
          <div className="flex items-center justify-between w-full max-w-sm">
             <div className="flex-1 flex justify-center">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex flex-col items-center justify-center active:scale-95 transition-all border border-white/20"
               >
                 <ImageIcon size={20} />
                 <span className="text-[8px] font-black uppercase mt-0.5">Galeria</span>
               </button>
             </div>
             
             <button 
               onClick={handleToggleRecording}
               className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-600' : 'border-white'} transition-all duration-300 transform active:scale-90`}
             >
               <div className={`w-16 h-16 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-600 scale-50 rounded-lg' : 'bg-white'}`} />
             </button>

             <div className="flex-1 flex justify-center">
               <button 
                 onClick={startCamera}
                 className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all border border-white/20"
               >
                 <RotateCcw size={20} />
               </button>
             </div>
          </div>
        ) : (
          <div className="flex space-x-4 w-full max-w-xs">
            <button 
              onClick={handleDiscard}
              className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-transform"
            >
              <RotateCcw size={18} />
              <span>Descartar</span>
            </button>
            <button 
              onClick={handlePost}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-transform"
            >
              <Send size={18} />
              <span>Publicar</span>
            </button>
          </div>
        )}
        
        {!isRecording && !previewUrl && (
          <p className="mt-6 text-white/50 text-[10px] font-bold uppercase tracking-widest">
            Grave até {MAX_DURATION}s ou escolha um arquivo
          </p>
        )}
      </div>
    </div>
  );
};

export default RecordView;
