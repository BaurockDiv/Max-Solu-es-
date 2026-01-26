
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Send, Sparkles, Zap, Image as ImageIcon, CheckCircle } from 'lucide-react';

interface RecordViewProps {
  onCancel: () => void;
  onPost: (blob: Blob, type: 'video' | 'image', caption: string) => void;
}

const MAX_DURATION = 60;

const RecordView: React.FC<RecordViewProps> = ({ onCancel, onPost }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isFinalStep, setIsFinalStep] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Permissão de câmera negada.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
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
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(blob));
      setIsRecording(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      setMediaBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  const handlePost = async () => {
    if (mediaBlob && !isPublishing) {
      setIsPublishing(true);
      await onPost(mediaBlob, mediaType, caption);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"><X size={24} /></button>
        {isRecording && <div className="bg-red-600 px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse">00:{duration < 10 ? `0${duration}` : duration}</div>}
      </div>

      <div className="flex-1 relative bg-zinc-900 overflow-hidden">
        {isFinalStep ? (
          <div className="h-full flex flex-col p-8 bg-zinc-950 justify-center space-y-6">
            <div className="aspect-[3/4] w-48 mx-auto rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl rotate-2">
              {mediaType === 'video' ? <video src={previewUrl!} autoPlay loop muted className="w-full h-full object-cover" /> : <img src={previewUrl!} className="w-full h-full object-cover" />}
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white text-center">Finalizar Publicação</h2>
              <textarea 
                placeholder="Escreva algo sobre este conteúdo..."
                className="w-full bg-zinc-900 border-none rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
        ) : (
          previewUrl ? (
            mediaType === 'video' ? <video src={previewUrl} className="w-full h-full object-cover" autoPlay loop playsInline /> : <img src={previewUrl} className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          )
        )}
      </div>

      <div className="p-8 bg-zinc-950">
        {!previewUrl ? (
          <div className="flex items-center justify-around w-full">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-white opacity-60"><ImageIcon size={24} /><span className="text-[10px] mt-1 uppercase font-bold">Galeria</span></button>
            <button onClick={isRecording ? stopRecording : startRecording} className={`w-20 h-20 rounded-full border-4 ${isRecording ? 'border-red-600' : 'border-white'} flex items-center justify-center`}><div className={`w-14 h-14 rounded-full ${isRecording ? 'bg-red-600 scale-50 rounded-xl' : 'bg-white'}`} /></button>
            <button onClick={startCamera} className="text-white opacity-60"><RotateCcw size={24} /></button>
          </div>
        ) : (
          <div className="flex space-x-4">
            {!isFinalStep ? (
              <>
                <button onClick={() => {setPreviewUrl(null); startCamera();}} className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><RotateCcw size={18}/>Refazer</button>
                <button onClick={() => setIsFinalStep(true)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">Próximo<CheckCircle size={18}/></button>
              </>
            ) : (
              <>
                <button onClick={() => setIsFinalStep(false)} className="px-6 py-4 bg-zinc-800 text-white rounded-2xl font-bold">Voltar</button>
                <button onClick={handlePost} disabled={isPublishing} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">{isPublishing ? 'Publicando...' : 'Confirmar & Publicar'}<Send size={18}/></button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordView;
