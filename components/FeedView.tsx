
import React, { useRef, useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, ShoppingBag, CheckCircle2, Loader2, X, Send, UserPlus, UserCheck } from 'lucide-react';
import { MOCK_BUSINESSES } from '../data';
import { MediaPost, Comment } from '../types';
import { supabase } from '../lib/supabase';

interface FeedViewProps {
  posts: MediaPost[];
  onProfileClick: (businessId: string) => void;
  hideFollowButton?: boolean;
}

const FeedView: React.FC<FeedViewProps> = ({ posts, onProfileClick, hideFollowButton }) => {
  if (posts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black p-10 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700">
           <MessageCircle size={40} />
        </div>
        <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-xs leading-relaxed">
          Nenhuma publicação encontrada nesta rede.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-black">
      {posts.map((post) => (
        <FeedItem key={post.id} post={post} onProfileClick={onProfileClick} hideFollowButton={hideFollowButton} />
      ))}
    </div>
  );
};

const FeedItem: React.FC<{ post: MediaPost; onProfileClick: (id: string) => void; hideFollowButton?: boolean }> = ({ post, onProfileClick, hideFollowButton }) => {
  const business = post.business || MOCK_BUSINESSES[post.businessId] || MOCK_BUSINESSES['b1'];
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(supabase.helpers.isFollowing(business.id));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (videoRef.current) videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    await supabase.from('posts').update({ likes: post.likes + (nextLiked ? 1 : 0) }).eq('id', post.id);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    supabase.helpers.toggleFollow(business.id);
    setIsFollowing(!isFollowing);
  };

  const loadComments = async () => {
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id);
    if (data) setComments(data);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    await supabase.from('comments').insert({ post_id: post.id, text: newCommentText });
    setNewCommentText('');
    loadComments();
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-zinc-950 overflow-hidden">
      {post.type === 'video' ? (
        <>
          <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isReady ? 'opacity-0' : 'opacity-100'}`}>
            <img src={post.thumbnail} className="h-full w-full object-cover filter blur-lg scale-110" alt="Thumbnail" />
          </div>
          <video
            ref={videoRef}
            src={post.url}
            className={`h-full w-full object-cover z-10 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            loop muted playsInline
            onCanPlay={() => setIsReady(true)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
          />
        </>
      ) : (
        <img src={post.url} className="h-full w-full object-cover" alt={post.caption} />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none z-20" />

      {/* Info Badge */}
      <div className="absolute bottom-10 left-6 right-16 text-white space-y-4 z-30">
        <div className="flex items-center space-x-3">
          <div className="relative" onClick={() => onProfileClick(business.id)}>
            <img src={business.logo} className="w-12 h-12 rounded-2xl border-2 border-white/50 shadow-xl object-cover" alt={business.name} />
            {!hideFollowButton && (
              <button 
                onClick={handleFollow}
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black transition-all ${isFollowing ? 'bg-zinc-800 text-white' : 'bg-blue-600 text-white active:scale-90'}`}
              >
                {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
              </button>
            )}
          </div>
          <div onClick={() => onProfileClick(business.id)} className="flex flex-col cursor-pointer">
            <div className="flex items-center space-x-1">
              <span className="font-black text-sm uppercase tracking-tight">{business.name}</span>
              {business.verified && <CheckCircle2 size={14} className="text-blue-400 fill-blue-400/20" />}
            </div>
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">{business.category}</span>
          </div>
        </div>

        <p className="text-[14px] leading-tight font-medium opacity-90 drop-shadow-md line-clamp-2 max-w-[85%]">
          {post.caption}
        </p>

        <a href={post.ctaUrl} className="inline-flex items-center space-x-3 bg-blue-600 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-500/20">
          <ShoppingBag size={16} />
          <span>{post.ctaText}</span>
        </a>
      </div>

      {/* Side Actions */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center space-y-6 text-white z-30">
        <ActionButton 
          active={liked}
          onClick={handleLike}
          icon={<Heart size={28} className={liked ? "fill-red-500 text-red-500" : ""} />} 
          count={post.likes + (liked ? 1 : 0)} 
        />
        <ActionButton 
          icon={<MessageCircle size={28} />} 
          count={comments.length || "2"} 
          onClick={() => { setShowComments(true); loadComments(); }} 
        />
        <ActionButton icon={<Share2 size={28} />} count="Share" />
      </div>

      {/* Comments Drawer */}
      {showComments && (
        <div className="absolute inset-0 z-[100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowComments(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2.5rem] h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-500">
             <div className="p-6 flex items-center justify-between border-b border-zinc-800">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Comentários</span>
                <button onClick={() => setShowComments(false)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {comments.length > 0 ? comments.map(c => (
                  <div key={c.id} className="flex space-x-4">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white">
                      {c.userEmail[0].toUpperCase()}
                    </div>
                    <div className="space-y-1">
                       <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black text-white uppercase">{c.userEmail.split('@')[0]}</span>
                          <span className="text-[8px] text-zinc-500 font-bold">AGORA</span>
                       </div>
                       <p className="text-sm text-zinc-300 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20">
                     <MessageCircle size={40} />
                     <p className="text-[10px] font-black uppercase tracking-widest mt-2">Seja o primeiro a comentar</p>
                  </div>
                )}
             </div>

             <form onSubmit={handleSendComment} className="p-6 bg-zinc-950 border-t border-zinc-800 flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Adicione um comentário..." 
                  className="flex-1 bg-zinc-900 border-none rounded-2xl py-4 px-6 text-sm text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button type="submit" className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90">
                   <Send size={18} />
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; count: string | number; active?: boolean; onClick?: () => void }> = ({ icon, count, active, onClick }) => (
  <div className="flex flex-col items-center space-y-1" onClick={onClick}>
    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl backdrop-blur-2xl transition-all cursor-pointer border border-white/10 shadow-xl ${active ? 'bg-white/20' : 'bg-black/30'}`}>
      {icon}
    </div>
    <span className="text-[9px] font-black drop-shadow-md tracking-widest uppercase">{count}</span>
  </div>
);

export default FeedView;
