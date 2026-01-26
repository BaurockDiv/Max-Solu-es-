
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Home, 
  Search, 
  LayoutDashboard, 
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

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userBusiness, setUserBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<ViewState>('feed');
  const [lastTab, setLastTab] = useState<ViewState>('feed');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [allPosts, setAllPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sistema de Tema
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
    if (!session && (activeTab === 'me' || activeTab === 'dashboard' || activeTab === 'record')) {
      return <AuthView onBack={() => setActiveTab('feed')} />;
    }
    switch (activeTab) {
      case 'feed':
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
      case 'discovery':
        return <DiscoveryView onBusinessClick={navigateToProfile} />;
      case 'profile':
        return (
          <ProfileView 
            business={selectedBusiness || ({} as any)} 
            posts={allPosts.filter(p => (p.businessId === selectedBusiness?.id || p.business?.id === selectedBusiness?.id))}
            onBack={() => setActiveTab(lastTab)} 
          />
        );
      case 'dashboard':
        return <DashboardView business={userBusiness} userPosts={allPosts.filter(p => (p.businessId === userBusiness?.id || p.business?.id === userBusiness?.id))} />;
      case 'me':
        return (
          <MeView 
            session={session} 
            business={userBusiness} 
            onUpdateBusiness={handleUpdateBusiness}
            theme={theme}
            onToggleTheme={(t) => setTheme(t)}
          />
        );
      case 'record':
        return <RecordView onCancel={() => setActiveTab('feed')} onPost={handleNewPost} />;
      default:
        return <FeedView posts={allPosts} onProfileClick={navigateToProfile} />;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-zinc-950 text-white font-bold tracking-widest animate-pulse uppercase">BizStream</div>;

  return (
    <div className={`mobile-frame transition-colors duration-500 ${theme === 'dark' ? 'dark bg-black' : 'bg-zinc-50'} flex flex-col h-screen overflow-hidden`}>
      <main className="flex-1 overflow-y-auto hide-scrollbar relative">
        {renderContent()}
      </main>

      {activeTab !== 'record' && (
        <nav className="h-[84px] border-t border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-2xl flex items-center justify-around px-6 z-50">
          <NavButton active={activeTab === 'feed'} icon={<Home size={22} />} label="Início" onClick={() => changeTab('feed')} />
          <NavButton active={activeTab === 'discovery'} icon={<Search size={22} />} label="Explorar" onClick={() => changeTab('discovery')} />
          
          <div className="flex flex-col items-center justify-center">
            <div 
              onClick={() => changeTab('record')} 
              className="w-[60px] h-[52px] rounded-[1.4rem] bg-blue-600 flex items-center justify-center text-white shadow-[0_8px_25px_rgb(37,99,235,0.4)] active:scale-95 transition-all cursor-pointer border-2 border-white/10"
            >
              <PlusSquare size={26} />
            </div>
          </div>

          <NavButton active={activeTab === 'dashboard'} icon={<LayoutDashboard size={22} />} label="Painel" onClick={() => changeTab('dashboard')} />
          <NavButton active={activeTab === 'me'} icon={session ? <User size={22} /> : <LogIn size={22} />} label={session ? "Perfil" : "Entrar"} onClick={() => changeTab('me')} />
        </nav>
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1 w-16 transition-all ${active ? 'text-blue-600' : 'text-zinc-500'}`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${active ? 'text-blue-600' : 'text-zinc-400'}`}>{label}</span>
  </button>
);

export default App;
