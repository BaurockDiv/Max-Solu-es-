
import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Image as ImageIcon,
    Mic,
    Phone,
    Video,
    Search,
    ArrowLeft,
    CheckCheck,
    Plus,
    MessageSquare,
    Loader2,
    X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Conversation, Message, Business } from '../types';

interface ChatViewProps {
    session: any;
    onBack: () => void;
    initialBizId?: string | null; // Este é o OWNER_ID do destinatário
}

const ChatView: React.FC<ChatViewProps> = ({ session, onBack, initialBizId }) => {
    // ESTADOS PRINCIPAIS
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // ESTADO PARA "NOVA CONVERSA" (GHOST)
    const [targetRecipient, setTargetRecipient] = useState<any>(null);

    // INPUTS
    const [newMessage, setNewMessage] = useState('');
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. CARREGAR MENSAGENS DE UMA CONVERSA
    const fetchMessages = async (convId: string) => {
        if (!convId || convId === 'ghost') return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
        }
    };

    // 2. CARREGAR TODAS AS CONVERSAS E RESOLVER O ALVO INICIAL
    const initOrRefresh = async () => {
        try {
            // Busca conversas do usuário logado
            const { data: convs, error } = await supabase
                .from('conversations')
                .select(`
                  *,
                  p1:businesses!conversations_participant_1_fkey(name, logo, owner_id, id),
                  p2:businesses!conversations_participant_2_fkey(name, logo, owner_id, id)
                `)
                .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            const formatted = convs.map(c => {
                const isP1 = c.participant_1 === session.user.id;
                const other = isP1 ? c.p2 : c.p1;
                return { ...c, other_participant: other };
            });

            setConversations(formatted);

            // SE VIEMOS DE UM PERFIL (initialBizId presente)
            if (initialBizId) {
                console.log("MODO ALVO: Buscando conversa com usuário:", initialBizId);

                // Normaliza a busca: (A com B) ou (B com A)
                const target = formatted.find(c =>
                    (c.participant_1 === initialBizId && c.participant_2 === session.user.id) ||
                    (c.participant_2 === initialBizId && c.participant_1 === session.user.id)
                );

                if (target) {
                    console.log("Conversa existente encontrada ID:", target.id);
                    setActiveConv(target);
                    setTargetRecipient(null);
                    await fetchMessages(target.id);
                } else {
                    console.log("Nenhuma conversa encontrada. Buscando perfil profissional...");
                    const { data: biz } = await supabase
                        .from('businesses')
                        .select('name, logo, owner_id, id')
                        .or(`owner_id.eq.${initialBizId},id.eq.${initialBizId}`)
                        .maybeSingle();

                    if (biz) {
                        setTargetRecipient(biz);
                        setActiveConv(null);
                        setMessages([]);
                    } else {
                        setTargetRecipient({ name: 'Profissional', owner_id: initialBizId });
                    }
                }
            }
        } catch (err) {
            console.error("ERRO CRITICAL CHAT INIT:", err);
        } finally {
            setLoading(false);
        }
    };

    // 3. EFEITO DE INICIALIZAÇÃO
    useEffect(() => {
        initOrRefresh();

        // FALLBACK: Recarrega a cada 15 segundos se o realtime falhar
        const pulse = setInterval(initOrRefresh, 15000);

        // REAL-TIME: Escuta novas mensagens
        const channel = supabase
            .channel(`user_chat_${session.user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                console.log("!!! REALTIME: NOVA MSG !!!", payload.new);
                initOrRefresh();
                if (activeConv && payload.new.conversation_id === activeConv.id) {
                    fetchMessages(activeConv.id);
                }
            })
            .subscribe((status) => {
                console.log("Realtime status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pulse);
        };
    }, [initialBizId, activeConv?.id]);

    // 4. ENVIO DE MENSAGEM (ESTRATÉGIA BLINDADA)
    const handleSend = async (content: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        if (!content.trim() && type === 'text') return;

        const recipientId = activeConv
            ? (activeConv.participant_1 === session.user.id ? activeConv.participant_2 : activeConv.participant_1)
            : targetRecipient?.owner_id;

        if (!recipientId || !session?.user?.id) {
            console.error("DESTINATARIO OU SESSÃO NÃO ENCONTRADA");
            return;
        }

        // UI Otimista
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: any = {
            id: tempId,
            sender_id: session.user.id,
            content: content,
            type: type,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setSending(true);

        try {
            // ORDENAR IDs PARA UNICIDADE (p1 sempre < p2)
            const [p1, p2] = [session.user.id, recipientId].sort();

            // Tenta criar ou recuperar a conversa atomitamente
            let { data: currentC, error: cErr } = await supabase.from('conversations')
                .upsert({
                    participant_1: p1,
                    participant_2: p2,
                    last_message: type === 'text' ? content.substring(0, 50) : `Arquivo: ${type}`,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'participant_1,participant_2' })
                .select()
                .single();

            if (cErr) {
                // Se o upsert falhou (pode acontecer em RLS restrito), fazemos busca manual
                const { data: retry } = await supabase.from('conversations')
                    .select('id')
                    .eq('participant_1', p1)
                    .eq('participant_2', p2)
                    .single();

                if (retry) {
                    currentC = retry as any;
                } else {
                    throw new Error("Não foi possível criar nem encontrar conversa.");
                }
            }

            if (currentC) {
                // Insere a mensagem real vinculado ao ID da conversa única
                const { error: mErr } = await supabase.from('messages').insert({
                    conversation_id: currentC.id,
                    sender_id: session.user.id,
                    content: content,
                    type: type
                });

                if (mErr) throw mErr;

                console.log("MENSAGEM ENVIADA COM SUCESSO!");

                // Se era um ghost chat, atualiza o estado para a conversa real
                if (targetRecipient) {
                    initOrRefresh();
                } else {
                    fetchMessages(currentC.id);
                }
            }
        } catch (err: any) {
            console.error("FALHA CRITICA NO ENVIO:", err);
            alert("Erro ao enviar: " + err.message);
            // Remove a otimista em caso de erro real
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setSending(false);
            scrollToBottom();
        }
    };

    // 5. UPLOAD DE MÍDIA
    const uploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSending(true);
        try {
            const path = `chat/${session.user.id}/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from('media').upload(path, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
            const type = file.type.startsWith('video') ? 'video' : 'image';
            await handleSend(publicUrl, type as any);
        } catch (err) {
            console.error("Upload Error:", err);
            alert("Erro ao enviar mídia.");
        } finally {
            setSending(false);
        }
    };

    // 6. GRAVAÇÃO DE ÁUDIO
    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const path = `chat/${session.user.id}/audio-${Date.now()}.webm`;
                const { error } = await supabase.storage.from('media').upload(path, blob);
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
                    await handleSend(publicUrl, 'audio');
                }
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
        } catch (err) {
            alert("Permita o uso do microfone.");
        }
    };

    const stopMic = () => { if (mediaRecorder) { mediaRecorder.stop(); setMediaRecorder(null); setRecording(false); } };

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    // UI DE CARREGAMENTO INICIAL
    if (loading && conversations.length === 0 && !targetRecipient) return (
        <div className="h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Iniciando Chat Seguro...</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black font-sans selection:bg-blue-600/20">
            {/* HEADER */}
            <div className="pt-12 pb-6 px-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-20">
                <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        {(activeConv || targetRecipient) && (
                            <button onClick={() => { setActiveConv(null); setTargetRecipient(null); setMessages([]); }} className="p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90">
                                <ArrowLeft size={22} className="text-zinc-600 dark:text-zinc-400" />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-500/20 border-2 border-white dark:border-zinc-800 overflow-hidden">
                                {activeConv?.other_participant?.logo || targetRecipient?.logo ? (
                                    <img src={activeConv?.other_participant?.logo || targetRecipient?.logo} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter italic leading-none">
                                    {activeConv ? activeConv.other_participant?.name : (targetRecipient?.name || 'Mensagens')}
                                </h1>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                                    {activeConv || targetRecipient ? 'Online' : `${conversations.length} Conversas`}
                                </p>
                            </div>
                        </div>
                    </div>
                    {(activeConv || targetRecipient) && (
                        <div className="flex items-center gap-2">
                            <button className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Phone size={18} /></button>
                            <button className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Video size={18} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL (LISTA OU JANELA) */}
            <div className="flex-1 overflow-hidden relative">
                {!activeConv && !targetRecipient ? (
                    /* LISTA DE CONVERSAS */
                    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-5xl mx-auto w-full no-scrollbar">
                        {conversations.length > 0 ? conversations.map(c => (
                            <button key={c.id} onClick={() => { setActiveConv(c); fetchMessages(c.id); }} className="w-full flex items-center gap-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm hover:border-blue-600/50 transition-all group active:scale-[0.98]">
                                <div className="w-16 h-16 rounded-[1.8rem] bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                                    <img src={c.other_participant?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover rounded-[1.6rem]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight">{c.other_participant?.name}</span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 line-clamp-1 font-medium italic">{c.last_message || 'Inicie uma conversa...'}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                <div className="p-8 bg-zinc-100 dark:bg-zinc-900 rounded-[3rem] text-zinc-300 dark:text-zinc-800">
                                    <MessageSquare size={60} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-zinc-950 dark:text-white uppercase tracking-tight">Vazio</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-6">Escolha um profissional no feed para começar a faturar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* JANELA DE CHAT ATIVA */
                    <div className="h-full flex flex-col max-w-5xl mx-auto w-full">
                        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 no-scrollbar bg-zinc-50 dark:bg-black/50">
                            <div className="text-center pb-6">
                                <span className="text-[8px] font-black uppercase text-zinc-400 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm">Segurança Máxima Ativada</span>
                            </div>

                            {messages.map((m) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                        <div className={`max-w-[85%] rounded-[2.2rem] px-6 py-4 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-800'}`}>
                                            {m.type === 'text' && <p className="text-sm font-semibold leading-relaxed">{m.content}</p>}
                                            {m.type === 'image' && <img src={m.content} className="max-w-full rounded-2xl shadow-lg border-2 border-white/10" />}
                                            {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-2xl shadow-lg border-2 border-white/10" />}
                                            {m.type === 'audio' && (
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-blue-600/10 text-blue-600'}`}><Mic size={16} /></div>
                                                    <audio src={m.content} controls className="h-8 max-w-[120px]" />
                                                </div>
                                            )}
                                            <div className={`flex items-center gap-1 mt-2 ${isMe ? 'justify-end text-blue-100/50' : 'text-zinc-400'} text-[8px] font-black uppercase`}>
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <CheckCheck size={10} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT SUPERIOR */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 pb-10">
                            <input type="file" ref={fileInputRef} onChange={uploadMedia} className="hidden" accept="image/*,video/*" />
                            <div className="flex items-center gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-blue-600 transition-all active:scale-90"><Plus size={24} /></button>

                                <div className="flex-1 relative">
                                    {recording ? (
                                        <div className="w-full h-12 bg-red-600/10 rounded-2xl flex items-center justify-between px-5">
                                            <div className="flex items-center gap-3 animate-pulse">
                                                <div className="w-2 h-2 bg-red-600 rounded-full" />
                                                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Gravando...</span>
                                            </div>
                                            <button onClick={stopMic} className="text-red-950 dark:text-white font-black text-[10px] uppercase bg-red-600 px-4 py-1.5 rounded-full">Finalizar</button>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend(newMessage)}
                                            placeholder="Sua mensagem profissional..."
                                            className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 text-sm font-semibold text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-600/50 shadow-inner transition-all"
                                        />
                                    )}
                                </div>

                                {newMessage.trim() && !recording ? (
                                    <button onClick={() => handleSend(newMessage)} disabled={sending} className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all">
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={recording ? stopMic : startMic} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${recording ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-600'}`}>
                                            <Mic size={22} />
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-blue-600"><ImageIcon size={22} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;
