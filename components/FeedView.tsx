
import React, { useRef, useEffect, useState, memo } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Maximize2, CheckCircle2, LayoutGrid } from 'lucide-react';
import { MediaPost } from '../types';

interface FeedViewProps {
  posts: MediaPost[];
  onProfileClick: (businessId: string) => void;
  hideFollowButton?: boolean;
}

const FeedView: React.FC<FeedViewProps> = ({ posts, onProfileClick, hideFollowButton }) => {
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Se não houver posts
  if (posts.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-black p-10 text-center space-y-4">
      <div className="w-20 h-20 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-200 dark:text-zinc-800">
        <LayoutGrid size={40} />
      </div>
      <p className="text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Sem novidades na região</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-black relative">
      {posts.map((post) => (
        <FeedItem
          key={post.id}
          post={post}
          onProfileClick={onProfileClick}
          hideFollowButton={hideFollowButton}
          isGlobalMuted={isGlobalMuted}
          hasInteracted={hasInteracted}
          onMuteToggle={() => {
            setIsGlobalMuted(!isGlobalMuted);
            setHasInteracted(true);
          }}
        />
      ))}
    </div>
  );
};

const FeedItem: React.FC<{
  post: MediaPost;
  onProfileClick: (id: string) => void;
  hideFollowButton?: boolean;
  isGlobalMuted: boolean;
  hasInteracted: boolean;
  onMuteToggle: () => void;
}> = memo(({ post, onProfileClick, hideFollowButton, isGlobalMuted, hasInteracted, onMuteToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const business = post.business;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        videoRef.current?.play().catch(() => { });
        setIsPlaying(true);
      } else {
        videoRef.current?.pause();
        setIsPlaying(false);
      }
    }, { threshold: 0.6 });
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  if (!business) return null;

  // Lógica do Alerta de Áudio: Só mostra se for vídeo, estiver mutado e usuário nunca interagiu
  const showAudioAlert = post.type === 'video' && isGlobalMuted && !hasInteracted;

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-black overflow-hidden animate-gpu">
      {post.type === 'video' ? (
        <video
          ref={videoRef}
          src={post.url}
          loop
          muted={isGlobalMuted}
          playsInline
          className={`h-full w-full transition-all duration-700 ease-in-out ${isExpanded ? 'object-contain' : 'object-cover'}`}
        />
      ) : (
        <img src={post.url} className="h-full w-full object-cover" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

      {/* Info Overlay - Esquerda */}
      <div className="absolute bottom-12 left-5 right-20 text-white space-y-4 z-30 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => onProfileClick(business.id)}>
          <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg">
            <img src={business.logo} className="w-full h-full rounded-[14px] object-cover border border-black/10" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[11px] uppercase tracking-widest">{business.name}</span>
              {business.verified && <CheckCircle2 size={12} className="text-blue-400" />}
            </div>
            <span className="text-[8px] font-black uppercase text-zinc-400 tracking-tighter">{business.category}</span>
          </div>
        </div>
        <p className="text-[12px] font-medium leading-relaxed opacity-90 line-clamp-3">{post.caption}</p>
      </div>

      {/* Ações Laterais - Coluna Única Perfeitamente Alinhada */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-30">

        {/* Controle de Expansão (Apenas Vídeo) */}
        {post.type === 'video' && (
          <ActionButton
            icon={<Maximize2 size={22} className={isExpanded ? 'text-blue-400' : 'text-white'} />}
            label="Tela"
            onClick={() => setIsExpanded(!isExpanded)}
          />
        )}

        {/* Controle de Áudio (Apenas Vídeo) */}
        {post.type === 'video' && (
          <ActionButton
            icon={isGlobalMuted ? <VolumeX size={24} className="text-white" /> : <Volume2 size={24} className="text-blue-400" />}
            label="Som"
            alert={showAudioAlert}
            onClick={onMuteToggle}
          />
        )}

        {/* Like */}
        <ActionButton
          icon={<Heart size={26} className={liked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'} />}
          label={post.likes.toString()}
          active={liked}
          onClick={() => setLiked(!liked)}
        />

        {/* Chat / Comentários */}
        <ActionButton
          icon={<MessageCircle size={24} className="text-white" />}
          label="Chat"
          onClick={() => { }}
        />

        {/* Compartilhar */}
        <ActionButton
          icon={<Share2 size={24} className="text-white" />}
          label="Link"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: business.name, url: post.url }).catch(() => { });
            }
          }}
        />
      </div>
    </div>
  );
});

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  alert?: boolean;
  onClick: () => void
}> = ({ icon, label, active, alert, onClick }) => (
  <button className="flex flex-col items-center gap-1.5 w-12 group" onClick={onClick}>
    <div className={`
      relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all border
      ${alert ? 'border-red-500/80 bg-red-500/20 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/5'}
      ${active ? 'bg-white/10 shadow-lg' : !alert && 'bg-black/20 group-hover:bg-black/40'}
      backdrop-blur-md active:scale-90
    `}>
      {icon}
      {/* Small dot indicator for alert/notification if needed, but styling above is better */}
      {alert && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black -translate-y-1/3 translate-x-1/3" />}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-tighter ${alert ? 'text-red-400 animate-pulse' : 'text-white/70'}`}>{label}</span>
  </button>
);

export default FeedView;
