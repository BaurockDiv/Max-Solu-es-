
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Home, Search, Users, User, PlusSquare, LogIn, AlertTriangle, X, Database } from 'lucide-react';
import { ViewState, Business, MediaPost } from './types';
import FeedView from './components/FeedView';
import DiscoveryView from './components/DiscoveryView';
import ProfileView from './components/ProfileView';
import DashboardView from './components/DashboardView';
import MeView from './components/MeView';
import RecordView from './components/RecordView';
import AuthView from './components/AuthView';
import FollowingView from './components/FollowingView';
import ChatView from './components/ChatView';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userBusiness, setUserBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<ViewState>('feed');
  const [lastTab, setLastTab] = useState<ViewState>('feed');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [allPosts, setAllPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{ title: string, msg: string, isSql?: boolean } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('maxcompany-theme') as 'light' | 'dark') || 'dark');
  const [activeChatBizId, setActiveChatBizId] = useState<string | null>(null);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [showProfileBadge, setShowProfileBadge] = useState(false);
  const [showMessagesBadge, setShowMessagesBadge] = useState(false);

  useEffect(() => {
    localStorage.setItem('maxcompany-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession) {
        fetchUserBusiness(currentSession.user.id);
        supabase.helpers.syncFollows(currentSession.user.id);
      }
      await fetchData();
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserBusiness(session.user.id);
        supabase.helpers.syncFollows(session.user.id);
      } else {
        setUserBusiness(null);
        supabase.helpers.clearSessionData();
        setActiveTab('feed');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sistema de Notificações em 3 Níveis
  useEffect(() => {
    if (!session?.user?.id) {
      setTotalUnreadMessages(0);
      setShowProfileBadge(false);
      setShowMessagesBadge(false);
      return;
    }

    const checkUnread = async () => {
      try {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`);

        if (!convs) return;

        let hasUnread = false;
        for (const conv of convs) {
          const lastReadTime = localStorage.getItem(`chat_lastRead_${conv.id}`);

          const { data: msgs } = await supabase
            .from('messages')
            .select('created_at, sender_id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgs && msgs.length > 0) {
            const lastMsgTime = new Date(msgs[0].created_at).getTime();
            const lastRead = lastReadTime ? new Date(lastReadTime).getTime() : 0;

            if (lastMsgTime > lastRead) {
              hasUnread = true;
              break;
            }
          }
        }

        setTotalUnreadMessages(hasUnread ? 1 : 0);

        // Nível 1: Badge no Perfil (some ao clicar na aba)
        const profileViewed = localStorage.getItem('notif_profile_viewed');
        if (hasUnread && (!profileViewed || new Date(profileViewed).getTime() < Date.now() - 1000)) {
          setShowProfileBadge(true);
        } else {
          setShowProfileBadge(false);
        }

        // Nível 2: Badge no botão Mensagens (some ao clicar no botão)
        const messagesViewed = localStorage.getItem('notif_messages_viewed');
        if (hasUnread && (!messagesViewed || new Date(messagesViewed).getTime() < Date.now() - 1000)) {
          setShowMessagesBadge(true);
        } else {
          setShowMessagesBadge(false);
        }
      } catch (err) {
        console.error('[UNREAD] Erro ao verificar:', err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const fetchUserBusiness = async (userId: string) => {
    const { data, error } = await supabase.from('businesses').select('*').eq('owner_id', userId).single();
    if (error && error.message.includes('column')) {
      setErrorModal({
        title: "Banco de Dados Incompleto",
        msg: "As colunas de contato (email, whatsapp, phone) não existem no seu Supabase. Execute o script SQL para corrigir.",
        isSql: true
      });
    }
    if (data) setUserBusiness(data as any);
  };

  const fetchData = async () => {
    const { data, error } = await supabase.from('posts').select('*, business:businesses(*)').order('created_at', { ascending: false }).limit(40);
    if (!error && data) {
      setAllPosts(data.map((p: any) => ({
        ...p,
        businessId: p.business_id,
        url: p.media_url,
        thumbnail: p.thumbnail_url,
        business: p.business,
        likes: Number(p.likes) || 0
      })) as any);
    }
  };

  const handleUpdateBusiness = (updated: Business) => {
    setUserBusiness(updated);
    fetchData();
  };

  const handleNewPost = async (blob: Blob, type: 'video' | 'image', caption: string, onProgress: (p: number, s: string) => void, thumbnailBlob?: Blob) => {
    if (!session || !userBusiness) throw new Error("Crie um perfil profissional antes de postar.");

    try {
      onProgress(10, 'Otimizando...');
      const fileExt = type === 'video' ? 'mp4' : 'jpg';
      const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
      const fileName = `posts/${session.user.id}-${Date.now()}.${fileExt}`;
      const arrayBuffer = await blob.arrayBuffer();

      onProgress(30, 'Enviando...');
      const { data, error } = await supabase.storage.from('media').upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
      let thumbnailUrl = publicUrl;

      if (type === 'video' && thumbnailBlob) {
        onProgress(60, 'Gerando capa...');
        const thumbName = `posts/${session.user.id}-${Date.now()}-thumb.jpg`;
        const thumbBuffer = await thumbnailBlob.arrayBuffer();
        const { data: thumbData, error: thumbError } = await supabase.storage.from('media').upload(thumbName, thumbBuffer, { contentType: 'image/jpeg', upsert: true });
        if (!thumbError && thumbData) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage.from('media').getPublicUrl(thumbData.path);
          thumbnailUrl = thumbUrl;
        }
      }

      onProgress(80, 'Publicando...');
      const { error: dbError } = await supabase.from('posts').insert({
        business_id: userBusiness.id,
        media_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        type,
        caption
      });

      if (dbError) throw dbError;
      onProgress(100, 'Concluído!');
      await fetchData();
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao publicar.');
    }
  };

  const renderContent = () => {
    if (loading) return <div className="flex-1 flex items-center justify-center bg-white dark:bg-black"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
    if (!session && activeTab === 'me') return <AuthView />;

    switch (activeTab) {
      case 'feed':
        return <FeedView posts={allPosts} onSelectBusiness={(biz) => { setSelectedBusiness(biz); setLastTab('feed'); setActiveTab('profile'); }} />;
      case 'discovery':
        return <DiscoveryView onSelectBusiness={(biz) => { setSelectedBusiness(biz); setLastTab('discovery'); setActiveTab('profile'); }} />;
      case 'following':
        return <FollowingView session={session} onSelectBusiness={(biz) => { setSelectedBusiness(biz); setLastTab('following'); setActiveTab('profile'); }} />;
      case 'me':
        return (
          <MeView
            session={session}
            business={userBusiness}
            userPosts={allPosts.filter(p => p.business_id === userBusiness?.id)}
            onUpdateBusiness={handleUpdateBusiness}
            theme={theme}
            onToggleTheme={setTheme}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onOpenChat={() => {
              setActiveChatBizId(null);
              setActiveTab('chat');
            }}
            onPreviewProfile={(id) => {
              const biz = allPosts.find(p => p.business_id === id)?.business;
              if (biz) {
                setSelectedBusiness(biz as any);
                setLastTab('me');
                setActiveTab('profile');
              }
            }}
            hasUnreadMessages={showMessagesBadge}
            onMessagesButtonClick={() => {
              localStorage.setItem('notif_messages_viewed', new Date().toISOString());
              setShowMessagesBadge(false);
            }}
          />
        );
      case 'profile':
        return <ProfileView business={selectedBusiness} onBack={() => setActiveTab(lastTab)} onOpenChat={(bizId) => { setActiveChatBizId(bizId); setActiveTab('chat'); }} />;
      case 'dashboard':
        return <DashboardView session={session} business={userBusiness} onBack={() => setActiveTab('me')} />;
      case 'chat':
        return <ChatView session={session} onBack={() => setActiveTab('me')} initialBizId={activeChatBizId} />;
      case 'record':
        return (
          <RecordView
            onBack={() => setActiveTab(lastTab)}
            onPublish={async (blob, type, caption, onProgress, thumb) => {
              if (!session) {
                setActiveTab('me');
                return;
              }
              await handleNewPost(blob, type, caption, onProgress, thumb);
            }}
          />
        );
    }

    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-black">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className={`mobile-frame animate-gpu bg-white dark:bg-black text-zinc-950 dark:text-white transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <main className="flex-1 overflow-hidden relative z-0 flex flex-col">
        {renderContent()}
      </main>

      {errorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[340px] rounded-[2.5rem] p-8 shadow-2xl border border-red-500/20 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${errorModal.isSql ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              {errorModal.isSql ? <Database size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{errorModal.title}</h3>
            <p className="text-zinc-500 text-[11px] leading-relaxed mb-8 font-medium">{errorModal.msg}</p>
            <button onClick={() => setErrorModal(null)} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
              <X size={16} /> Entendi
            </button>
          </div>
        </div>
      )}

      <nav className={`h-[84px] min-h-[84px] max-h-[84px] border-t shrink-0 ${theme === 'dark' ? 'border-zinc-900 bg-black/95' : 'border-zinc-100 bg-white/95'} backdrop-blur-md grid grid-cols-5 items-start pt-3 w-full z-[150] safe-area-bottom relative`}>
        <div className="flex justify-center items-center w-full">
          <NavButton
            active={activeTab === 'feed'}
            icon={<Home size={22} />}
            label="Início"
            onClick={() => {
              if (activeTab === 'feed') {
                setAllPosts([]);
                fetchData();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setActiveTab('feed');
              }
            }}
            theme={theme}
          />
        </div>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'discovery'} icon={<Search size={22} />} label="Busca" onClick={() => setActiveTab('discovery')} theme={theme} />
        </div>
        <div className="flex justify-center items-center w-full">
          <div onClick={() => setActiveTab('record')} className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all cursor-pointer mt-1"><PlusSquare size={24} /></div>
        </div>
        <div className="flex justify-center items-center w-full">
          <NavButton active={activeTab === 'following'} icon={<Users size={22} />} label="Seguindo" onClick={() => setActiveTab('following')} theme={theme} />
        </div>
        <div className="flex justify-center items-center w-full relative">
          <NavButton
            active={activeTab === 'me'}
            icon={session ? <User size={22} /> : <LogIn size={22} />}
            label="Perfil"
            onClick={() => {
              localStorage.setItem('notif_profile_viewed', new Date().toISOString());
              setShowProfileBadge(false);
              setActiveTab('me');
            }}
            theme={theme}
          />
          {session && showProfileBadge && (
            <div className="absolute top-1 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
          )}
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick, theme }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 w-14 h-14 transition-all duration-300 ${active ? 'text-blue-600' : theme === 'dark' ? 'text-zinc-600' : 'text-zinc-500'}`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

export default App;
