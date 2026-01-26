
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
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
        }
      },
      { threshold: 0.7 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-900 overflow-hidden">
      {post.type === 'video' ? (
        <>
          <img 
            src={post.thumbnail} 
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${isReady && isPlaying ? 'opacity-0' : 'opacity-100'}`} 
            alt="Loading"
          />
          
          <video
            ref={videoRef}
            src={post.url}
            className={`h-full w-full object-cover transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            loop
            muted
            playsInline
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => { setIsBuffering(false); setIsReady(true); }}
            onCanPlay={() => setIsReady(true)}
          />

          {isBuffering && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
              <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
            </div>
          )}
        </>
      ) : (
        <img src={post.url} className="h-full w-full object-cover" alt={post.caption} />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

      <div className="absolute bottom-4 left-4 right-16 text-white space-y-3 z-10">
        <div 
          onClick={() => onProfileClick(post.businessId)}
          className="flex items-center space-x-2 cursor-pointer group/badge inline-flex p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <img src={business.logo} className="w-10 h-10 rounded-full border-2 border-white shadow-lg" alt={business.name} />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-sm drop-shadow-md">{business.name}</span>
              {business.verified && <CheckCircle2 size={14} className="text-blue-400 fill-blue-400/20" />}
            </div>
            <span className="text-xs text-zinc-300 drop-shadow-md">{business.category}</span>
          </div>
        </div>

        <p className="text-sm leading-snug line-clamp-3 font-normal opacity-90 drop-shadow-md max-w-[85%]">
          {post.caption}
        </p>

        <a 
          href={post.ctaUrl}
          onClick={(e) => { e.preventDefault(); alert(`Direcionando para: ${post.ctaText}`); }}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-xl shadow-blue-900/40"
        >
          <ShoppingBag size={18} />
          <span>{post.ctaText}</span>
        </a>
      </div>

      <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6 text-white z-10">
        <ActionButton 
          active={liked}
          onClick={() => setLiked(!liked)}
          icon={<Heart size={28} className={liked ? "fill-red-500 text-red-500" : "fill-white/10"} />} 
          count={post.likes + (liked ? 1 : 0)} 
        />
        <ActionButton icon={<MessageCircle size={28} />} count="12" onClick={() => alert("Comentários em breve!")} />
        <ActionButton icon={<Share2 size={28} />} count="Share" onClick={() => alert("Link copiado!")} />
        <div className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-md flex items-center justify-center border border-white/20 active:bg-zinc-700 transition-colors cursor-pointer">
          <ExternalLink size={18} />
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count: string | number; active?: boolean; onClick?: () => void }> = ({ icon, count, active, onClick }) => (
  <div className="flex flex-col items-center space-y-1" onClick={onClick}>
    <div className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md transition-all cursor-pointer border border-white/5 ${active ? 'bg-white/30' : 'bg-white/10 active:bg-white/30'}`}>
      {icon}
    </div>
    <span className="text-xs font-bold drop-shadow-md">{count}</span>
  </div>
);

export default FeedView;
