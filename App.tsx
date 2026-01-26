
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Home, 
  Search, 
  Users, 
  User, 
  PlusSquare,
  LogIn
} from 'lucide-react';
import { ViewState, Business, MediaPost } from './types';
import { MOCK_BUSINESSES } from './data';
import FeedView from './components/FeedView';
import DiscoveryView from './components/DiscoveryView';
import ProfileView from './components/ProfileView';
import DashboardView from './components/DashboardView';
import MeView from './components/MeView';
import RecordView from './components/RecordView';
import AuthView from './components/AuthView';
import FollowingView from './components/FollowingView';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userBusiness, setUserBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<ViewState>('feed');
  const [lastTab, setLastTab] = useState<ViewState>('feed');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [allPosts, setAllPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bizstream-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('bizstream-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserBusiness(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserBusiness(session.user.id);
      else {
        setUserBusiness(null);
        setActiveTab('feed');
      }
    });

    fetchData();
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserBusiness = async (userId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .single();
    if (data) setUserBusiness(data as any);
  };

  const fetchData = async () => {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select(`*, business:businesses(*)`)
        .order('created_at', { ascending: false });
      
      if (posts) {
        const normalized = posts.map((p: any) => ({
          ...p,
          businessId: p.businessId || p.business_id,
          url: p.url || p.media_url,
          thumbnail: p.thumbnail || p.thumbnail_url,
          business: p.business || { id: p.businessId || p.business_id, name: "Meu Negócio", logo: 'https://picsum.photos/200/200' }
        }));
        setAllPosts(normalized as any);
      }
    } catch (err) {
      console.warn("Erro ao buscar posts:", err);
    }
  };

  const handleUpdateBusiness = (updatedBiz: Business) => {
    setUserBusiness(updatedBiz);
    setAllPosts(current => current.map(post => {
      if (post.businessId === updatedBiz.id || post.business?.id === updatedBiz.id) {
        return { ...post, business: updatedBiz };
      }
      return post;
    }));
  };

  const handleNewPost = async (mediaBlob: Blob, type: 'video' | 'image', caption: string) => {
    if (!session) return;
    try {
      let bizId = userBusiness?.id;
      if (!bizId) {
        const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', session.user.id).single();
        bizId = biz?.id;
      }
      if (!bizId) {
        alert("Erro: Crie um perfil de negócio primeiro.");
        return;
      }
      const fileName = `${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`${session.user.id}/${fileName}`, mediaBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(uploadData.path);
      const { error: dbError } = await supabase.from('posts').insert({
        business_id: bizId,
        type: type,
        media_url: publicUrl,
        caption: caption || "Publicação sem legenda",
        cta_text: "Saiba Mais"
      });
      if (!dbError) {
        await fetchData();
        setActiveTab('feed');
      }
    } catch (err: any) {
      alert("Erro ao publicar: " + err.message);
    }
  };

  const navigateToProfile = (businessId: string) => {
    const post = allPosts.find(p => p.businessId === businessId);
    if (post?.business) {
      setSelectedBusiness(post.business as any);
      setLastTab(activeTab);
      setActiveTab('profile');
    } else {
      const biz = MOCK_BUSINESSES[businessId];
      if (biz) {
        setSelectedBusiness(biz as any);
        setLastTab(activeTab);
        setActiveTab('profile');
      }
    }
  };

  const changeTab = (tab: ViewState) => {
    setLastTab(activeTab);
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (!session && (activeTab === 'me' || activeTab === 'following' || activeTab === 'record' || activeTab === 'dashboard')) {
      return <AuthView onBack={() => setActiveTab('feed')} />;
    }
    switch (activeTab) {
      case 'feed':
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
      case 'discovery':
        return <DiscoveryView onBusinessClick={navigateToProfile} />;
      case 'following':
        return <FollowingView onProfileClick={navigateToProfile} />;
      case 'profile':
        return (
          <ProfileView 
            business={selectedBusiness || ({} as any)} 
            posts={allPosts.filter(p => (p.businessId === selectedBusiness?.id || p.business?.id === selectedBusiness?.id))}
            onBack={() => setActiveTab(lastTab)} 
          />
        );
      case 'dashboard':
        return (
          <div className="h-full bg-white dark:bg-black overflow-y-auto">
            <button onClick={() => setActiveTab('me')} className="m-6 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Voltar ao Perfil</button>
            <DashboardView business={userBusiness} userPosts={allPosts.filter(p => (p.businessId === userBusiness?.id || p.business?.id === userBusiness?.id))} />
          </div>
        );
      case 'me':
        return (
          <MeView 
            session={session} 
            business={userBusiness} 
            onUpdateBusiness={handleUpdateBusiness}
            theme={theme}
            onToggleTheme={(t) => setTheme(t)}
            onOpenDashboard={() => setActiveTab('dashboard')}
          />
        );
      case 'record':
        return <RecordView onCancel={() => setActiveTab('feed')} onPost={handleNewPost} />;
      default:
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-white font-black tracking-[0.4em] animate-pulse uppercase">BizStream</div>;

  return (
    <div className={`mobile-frame transition-colors duration-500 ${theme === 'dark' ? 'dark bg-black text-white' : 'bg-white text-zinc-950'} flex flex-col h-screen overflow-hidden`}>
      <main className="flex-1 overflow-y-auto hide-scrollbar relative">
        {renderContent()}
      </main>

      {activeTab !== 'record' && (
        <nav className={`h-[84px] border-t transition-colors duration-500 ${theme === 'dark' ? 'border-zinc-900 bg-black' : 'border-zinc-100 bg-white'} flex items-center justify-around px-6 z-50`}>
          <NavButton active={activeTab === 'feed'} icon={<Home size={24} />} label="Feed" onClick={() => changeTab('feed')} theme={theme} />
          <NavButton active={activeTab === 'discovery'} icon={<Search size={24} />} label="Buscar" onClick={() => changeTab('discovery')} theme={theme} />
          
          <div className="flex flex-col items-center justify-center">
            <div 
              onClick={() => changeTab('record')} 
              className={`w-[58px] h-[58px] rounded-[1.6rem] bg-blue-600 flex items-center justify-center text-white shadow-[0_8px_30px_rgb(37,99,235,0.3)] active:scale-90 transition-all cursor-pointer`}
            >
              <PlusSquare size={28} />
            </div>
          </div>

          <NavButton active={activeTab === 'following'} icon={<Users size={24} />} label="Rede" onClick={() => changeTab('following')} theme={theme} />
          <NavButton active={activeTab === 'me'} icon={session ? <User size={24} /> : <LogIn size={24} />} label={session ? "Eu" : "Entrar"} onClick={() => changeTab('me')} theme={theme} />
        </nav>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void; theme: 'light' | 'dark' }> = ({ active, icon, label, onClick, theme }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1.5 w-14 transition-all ${active ? 'text-blue-600' : theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className={`transition-all duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>
      {icon}
    </div>
    <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-colors`}>{label}</span>
  </button>
);

export default App;
