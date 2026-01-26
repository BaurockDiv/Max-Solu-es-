
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
  const business = post.business || MOCK_BUSINESSES[post.businessId] || MOCK_BUSINESSES['b1'];
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
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            }
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
          setIsReady(false);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-950 overflow-hidden">
      {post.type === 'video' ? (
        <>
          <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isReady ? 'opacity-0' : 'opacity-100'}`}>
            <img src={post.thumbnail} className="h-full w-full object-cover filter blur-[2px] scale-105" alt="Thumbnail" />
          </div>
          <video
            ref={videoRef}
            src={post.url}
            className={`h-full w-full object-cover transition-opacity duration-700 z-10 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            loop
            muted
            playsInline
            preload="metadata"
            onCanPlay={() => setIsReady(true)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => { setIsBuffering(false); setIsReady(true); }}
          />
          {isBuffering && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
              <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
            </div>
          )}
        </>
      ) : (
        <img src={post.url} className="h-full w-full object-cover" alt={post.caption} />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

      <div className="absolute bottom-10 left-6 right-16 text-white space-y-4 z-30">
        <div 
          onClick={() => onProfileClick(post.businessId)}
          className="flex items-center space-x-3 cursor-pointer group/badge inline-flex p-1.5 pr-4 rounded-[2rem] hover:bg-white/10 transition-all backdrop-blur-md border border-white/10"
        >
          <img src={business.logo} className="w-12 h-12 rounded-[1.2rem] border-2 border-white/80 shadow-lg object-cover" alt={business.name} />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-black text-sm drop-shadow-md">{business.name}</span>
              {business.verified && <CheckCircle2 size={16} className="text-blue-400 fill-blue-400/20" />}
            </div>
            <span className="text-[10px] text-zinc-300 font-black uppercase tracking-wider">{business.category}</span>
          </div>
        </div>

        <p className="text-[15px] leading-snug line-clamp-3 font-medium opacity-95 drop-shadow-lg max-w-[90%] tracking-tight">
          {post.caption}
        </p>

        <div className="pt-2">
          <a 
            href={post.ctaUrl}
            onClick={(e) => { e.preventDefault(); alert(`CTA: ${post.ctaText}`); }}
            className="inline-flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-[0_10px_25px_rgb(37,99,235,0.4)]"
          >
            <ShoppingBag size={18} />
            <span>{post.ctaText}</span>
          </a>
        </div>
      </div>

      <div className="absolute right-4 bottom-28 flex flex-col items-center space-y-8 text-white z-30">
        <ActionButton 
          active={liked}
          onClick={() => setLiked(!liked)}
          icon={<Heart size={30} className={liked ? "fill-red-500 text-red-500" : "fill-white/10"} />} 
          count={post.likes + (liked ? 1 : 0)} 
        />
        <ActionButton icon={<MessageCircle size={30} />} count="24" onClick={() => {}} />
        <ActionButton icon={<Share2 size={30} />} count="Share" onClick={() => {}} />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count: string | number; active?: boolean; onClick?: () => void }> = ({ icon, count, active, onClick }) => (
  <div className="flex flex-col items-center space-y-2" onClick={onClick}>
    <div className={`w-14 h-14 flex items-center justify-center rounded-[1.5rem] backdrop-blur-2xl transition-all cursor-pointer border border-white/10 shadow-xl ${active ? 'bg-white/20' : 'bg-black/20 active:bg-white/30'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-black drop-shadow-md tracking-widest uppercase">{count}</span>
  </div>
);

export default FeedView;
