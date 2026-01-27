
import React, { useRef, useEffect, useState, memo } from 'react';
import { Heart, MessageCircle, Share2, ShoppingBag, CheckCircle2, X, Send, UserPlus, UserCheck, Loader2 } from 'lucide-react';
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
        <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-zinc-700">
           <MessageCircle size={40} />
        </div>
        <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[11px] leading-relaxed">Nenhuma publicação na sua região.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-black smooth-scroll">
      {posts.map((post) => (
        <FeedItem key={post.id} post={post} onProfileClick={onProfileClick} hideFollowButton={hideFollowButton} />
      ))}
    </div>
  );
};

const FeedItem: React.FC<{ post: MediaPost; onProfileClick: (id: string) => void; hideFollowButton?: boolean }> = memo(({ post, onProfileClick, hideFollowButton }) => {
  const business = post.business;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    checkInitialStatus();
    const observer = new IntersectionObserver(([entry]) => {
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
    }, { threshold: 0.5 });
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [post.id]);

  const checkInitialStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: likeData } = await supabase.from('post_likes').select('*').match({ post_id: post.id, user_id: session.user.id }).single();
      setLiked(!!likeData);
      if (business) setIsFollowing(supabase.helpers.isFollowing(business.id));
    }
  };

  const handleLike = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Crie uma conta para interagir com empresas!");

    const previousLiked = liked;
    const previousCount = likesCount;

    setLiked(!liked);
    setLikesCount(prev => !liked ? prev + 1 : prev - 1);

    try {
      if (!liked) {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id });
        await supabase.rpc('increment_likes', { row_id: post.id });
      } else {
        await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: session.user.id });
        await supabase.rpc('decrement_likes', { row_id: post.id });
      }
    } catch (err) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Faça login para seguir empresas!");
    if (business) {
      await supabase.helpers.toggleFollow(business.id, session.user.id);
      setIsFollowing(!isFollowing);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: false });
    if (data) setComments(data as any);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await supabase.from('comments').insert({ 
        post_id: post.id, 
        text: newCommentText, 
        user_id: session.user.id, 
        user_email: session.user.email 
      });
      setNewCommentText('');
      await loadComments();
    } catch (err: any) {
      alert("Erro ao comentar: " + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!business) return null;

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-black overflow-hidden animate-gpu">
      {post.type === 'video' ? (
        <>
          <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${isReady ? 'opacity-0' : 'opacity-100'}`}>
            <img src={post.thumbnail || ''} className="h-full w-full object-cover filter blur-3xl opacity-50" alt="Loading" />
            <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 className="animate-spin text-white/10" size={32} />
            </div>
          </div>
          <video 
            ref={videoRef} 
            src={post.url} 
            className={`h-full w-full object-cover z-10 transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'}`} 
            loop muted playsInline 
            onCanPlay={() => setIsReady(true)} 
          />
        </>
      ) : (
        <img src={post.url} className="h-full w-full object-cover" alt={post.caption} />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none z-20" />

      {/* Interface de Texto */}
      <div className="absolute bottom-10 left-5 right-16 text-white space-y-4 z-30 pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="relative" onClick={() => onProfileClick(business.id)}>
            <div className="w-12 h-12 rounded-[1.6rem] p-0.5 bg-gradient-to-tr from-blue-600 to-indigo-500">
              <img src={business.logo || 'https://picsum.photos/200/200'} className="w-full h-full rounded-[1.4rem] border-2 border-black object-cover" alt={business.name} />
            </div>
            {!hideFollowButton && (
              <button onClick={handleFollow} className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border border-black shadow-lg transition-all ${isFollowing ? 'bg-zinc-800' : 'bg-blue-600 active:scale-90'}`}>
                {isFollowing ? <UserCheck size={10} /> : <UserPlus size={10} />}
              </button>
            )}
          </div>
          <div onClick={() => onProfileClick(business.id)} className="flex flex-col cursor-pointer">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-[12px] uppercase tracking-widest">{business.name}</span>
              {business.verified && <CheckCircle2 size={12} className="text-blue-400 fill-blue-400/10" />}
            </div>
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em]">{business.category}</span>
          </div>
        </div>
        <p className="text-[13px] font-medium leading-relaxed opacity-90 line-clamp-3 max-w-[90%]">{post.caption}</p>
        
        {post.cta_text && (
          <button className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all">
            <ShoppingBag size={14} /> {post.cta_text}
          </button>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-6 text-white z-30">
        <ActionButton 
          active={liked} 
          onClick={handleLike} 
          icon={<Heart size={26} className={`transition-all duration-300 ${liked ? "fill-red-500 text-red-500 scale-125" : "text-white"}`} />} 
          count={likesCount} 
        />
        <ActionButton icon={<MessageCircle size={26} />} count={comments.length > 0 ? comments.length : "Feed"} onClick={() => { setShowComments(true); loadComments(); }} />
        <ActionButton icon={<Share2 size={26} />} count="Link" onClick={() => navigator.share({ url: post.url }).catch(() => {})} />
      </div>

      {/* Modal de Comentários */}
      {showComments && (
        <div className="absolute inset-0 z-[100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowComments(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2.5rem] h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-500 border-t border-white/5 overflow-hidden">
             <div className="p-5 flex items-center justify-between border-b border-white/5">
                <div className="space-y-0.5">
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Publicação</span>
                   <p className="text-[11px] font-black text-white uppercase tracking-tighter">{comments.length} Comentários</p>
                </div>
                <button onClick={() => setShowComments(false)} className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center active:scale-90 transition-all text-zinc-400"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar smooth-scroll">
                {comments.length > 0 ? comments.map(c => (
                  <div key={c.id} className="flex space-x-3 animate-in slide-in-from-left duration-300">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-[11px] font-black text-blue-500 flex-shrink-0">{c.user_email?.[0]?.toUpperCase()}</div>
                    <div className="space-y-1 flex-1">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-300">{c.user_email?.split('@')[0]}</span>
                          <span className="text-[8px] font-bold text-zinc-600 uppercase">Agora</span>
                       </div>
                       <p className="text-[13px] text-zinc-400 font-medium leading-normal">{c.text}</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 py-10">
                    <MessageCircle size={48} />
                    <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Seja o primeiro a comentar</p>
                  </div>
                )}
             </div>

             <form onSubmit={handleSendComment} className="p-5 bg-zinc-950 border-t border-white/5 flex items-center gap-3 safe-area-bottom">
                <input 
                  type="text" 
                  placeholder="Escreva algo..." 
                  className="flex-1 bg-zinc-900 rounded-xl py-3.5 px-5 text-[14px] text-white focus:ring-1 focus:ring-blue-600 outline-none border-none placeholder:text-zinc-600" 
                  value={newCommentText} 
                  onChange={(e) => setNewCommentText(e.target.value)} 
                  disabled={isSubmittingComment}
                />
                <button 
                  type="submit" 
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
                >
                  {isSubmittingComment ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
});

const ActionButton: React.FC<{ icon: React.ReactNode; count: string | number; active?: boolean; onClick?: () => void }> = ({ icon, count, active, onClick }) => (
  <button className="flex flex-col items-center space-y-1.5 w-12" onClick={onClick}>
    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${active ? 'bg-white/10 shadow-lg' : 'bg-black/20'}`}>
       {icon}
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 truncate w-full text-center">{count}</span>
  </button>
);

export default FeedView;
