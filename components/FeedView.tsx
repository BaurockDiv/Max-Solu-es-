
import React, { useRef, useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, ShoppingBag, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { MOCK_BUSINESSES } from '../data';
import { MediaPost } from '../types';

interface FeedViewProps {
  posts: MediaPost[];
  onProfileClick: (businessId: string) => void;
}

const FeedView: React.FC<FeedViewProps> = ({ posts, onProfileClick }) => {
  return (
    <div className="h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-black">
      {posts.map((post) => (
        <FeedItem key={post.id} post={post} onProfileClick={onProfileClick} />
      ))}
    </div>
  );
};

const FeedItem: React.FC<{ post: MediaPost; onProfileClick: (id: string) => void }> = ({ post, onProfileClick }) => {
  const business = MOCK_BUSINESSES[post.businessId] || MOCK_BUSINESSES['b1'];
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Quando pelo menos 60% do vídeo está visível, tenta reproduzir
          if (videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => setIsPlaying(true))
                .catch(() => {
                  // Autoplay bloqueado pelo navegador até interação
                  setIsPlaying(false);
                });
            }
          }
        } else {
          // Pausa e reseta quando sai da tela para poupar recursos
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
          setIsReady(false);
        }
      },
      { threshold: 0.6 } // Limite de 60% de visibilidade
    );

    if (videoRef.current) observer.observe(videoRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleCanPlay = () => {
    setIsReady(true);
    setIsBuffering(false);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setIsReady(true);
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-950 overflow-hidden">
      {post.type === 'video' ? (
        <>
          {/* Thumbnail/Poster fixo para transição suave */}
          <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isReady ? 'opacity-0' : 'opacity-100'}`}>
            <img 
              src={post.thumbnail} 
              className="h-full w-full object-cover filter blur-[2px] scale-105" 
              alt="Thumbnail background"
            />
          </div>

          <video
            ref={videoRef}
            src={post.url}
            className={`h-full w-full object-cover transition-opacity duration-700 z-10 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            loop
            muted
            playsInline
            preload="metadata"
            onCanPlay={handleCanPlay}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
          />

          {/* Indicador de Buffering */}
          {isBuffering && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
            </div>
          )}
        </>
      ) : (
        <img src={post.url} className="h-full w-full object-cover" alt={post.caption} />
      )}

      {/* Gradiente Overlay para Leitura */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

      {/* Conteúdo Overlay */}
      <div className="absolute bottom-6 left-4 right-16 text-white space-y-3 z-30">
        <div 
          onClick={() => onProfileClick(post.businessId)}
          className="flex items-center space-x-2 cursor-pointer group/badge inline-flex p-1.5 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm"
        >
          <img src={business.logo} className="w-10 h-10 rounded-full border-2 border-white/80 shadow-lg" alt={business.name} />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-sm drop-shadow-md">{business.name}</span>
              {business.verified && <CheckCircle2 size={14} className="text-blue-400 fill-blue-400/20" />}
            </div>
            <span className="text-[10px] text-zinc-300 font-medium tracking-wide uppercase">{business.category}</span>
          </div>
        </div>

        <p className="text-[14px] leading-snug line-clamp-3 font-medium opacity-90 drop-shadow-lg max-w-[90%]">
          {post.caption}
        </p>

        <div className="pt-2">
          <a 
            href={post.ctaUrl}
            onClick={(e) => { e.preventDefault(); alert(`Direcionando para: ${post.ctaText}`); }}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-xl shadow-blue-900/40"
          >
            <ShoppingBag size={18} />
            <span>{post.ctaText}</span>
          </a>
        </div>
      </div>

      {/* Botões de Ação Laterais */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 text-white z-30">
        <ActionButton 
          active={liked}
          onClick={() => setLiked(!liked)}
          icon={<Heart size={28} className={liked ? "fill-red-500 text-red-500" : "fill-white/10"} />} 
          count={post.likes + (liked ? 1 : 0)} 
        />
        <ActionButton icon={<MessageCircle size={28} />} count="12" onClick={() => alert("Comentários em breve!")} />
        <ActionButton icon={<Share2 size={28} />} count="Share" onClick={() => alert("Link copiado!")} />
        <div className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-md flex items-center justify-center border border-white/20 active:bg-zinc-700 transition-colors cursor-pointer shadow-lg">
          <ExternalLink size={18} />
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count: string | number; active?: boolean; onClick?: () => void }> = ({ icon, count, active, onClick }) => (
  <div className="flex flex-col items-center space-y-1.5" onClick={onClick}>
    <div className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl transition-all cursor-pointer border border-white/10 shadow-lg ${active ? 'bg-white/20' : 'bg-black/20 active:bg-white/30'}`}>
      {icon}
    </div>
    <span className="text-[11px] font-bold drop-shadow-md tracking-tight">{count}</span>
  </div>
);

export default FeedView;
