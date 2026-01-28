
import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Image as ImageIcon,
    Mic,
    ArrowLeft,
    CheckCheck,
    Plus,
    MessageSquare,
    Loader2,
    User,
    Video,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

interface ChatViewProps {
    session: any;
    onBack: () => void;
    initialBizId?: string | null;
}

const ChatView: React.FC<ChatViewProps> = ({ session, onBack, initialBizId }) => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [recipient, setRecipient] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeConvIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeConvIdRef.current = activeConvId;
    }, [activeConvId]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 100);
    };

    const fetchMessages = async (id: string, silent = false) => {
        if (!id) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
            if (!silent) scrollToBottom();
        }
    };

    const fetchConversations = async () => {
        if (!session?.user?.id) return;

        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                p1:businesses!conversations_participant_1_fkey(name, logo, owner_id),
                p2:businesses!conversations_participant_2_fkey(name, logo, owner_id)
            `)
            .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            const formatted = data.map(c => {
                const isP1 = c.participant_1 === session.user.id;
                // Identifica o "outro" e tenta pegar dados do negócio, se existir
                const otherBiz = isP1 ? c.p2 : c.p1;
                const otherId = isP1 ? c.participant_2 : c.participant_1;

                return {
                    ...c,
                    other: otherBiz || { name: `Usuário ${otherId.substring(0, 5)}`, owner_id: otherId }
                };
            });
            setConversations(formatted);
        }
    };

    const resolveChat = async () => {
        if (!session?.user?.id) return;
        setLoading(true);

        try {
            // Sempre carrega a lista para garantir que o estado local esteja sincronizado
            await fetchConversations();

            if (initialBizId) {
                // Tenta achar na lista carregada
                const { data: convs } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_1.eq.${initialBizId},participant_2.eq.${session.user.id})`)
                    .maybeSingle();

                if (convs) {
                    setActiveConvId(convs.id);
                    await fetchMessages(convs.id);

                    // Busca dados do destinatário para o Header
                    const { data: biz } = await supabase
                        .from('businesses')
                        .select('name, logo, owner_id')
                        .eq('owner_id', initialBizId)
                        .maybeSingle();
                    setRecipient(biz || { name: 'Profissional', owner_id: initialBizId });
                } else {
                    // Novo chat (Ghost)
                    const { data: biz } = await supabase
                        .from('businesses')
                        .select('name, logo, owner_id')
                        .eq('owner_id', initialBizId)
                        .maybeSingle();
                    setRecipient(biz || { name: 'Profissional', owner_id: initialBizId });
                    setActiveConvId(null);
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error("Erro no ResolveChat:", err);
        } finally {
            setLoading(false);
            scrollToBottom('auto');
        }
    };

    const sendMessage = async (text: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        if (!text.trim() && type === 'text') return;
        const targetId = initialBizId || recipient?.owner_id;
        if (!targetId || !session?.user?.id) return;

        const tempId = 'temp-' + Date.now();
        const optimisticMsg: any = {
            id: tempId,
            sender_id: session.user.id,
            content: text,
            type: type,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setSending(true);
        scrollToBottom();

        try {
            let convId = activeConvId;

            if (!convId) {
                const [p1, p2] = [session.user.id, targetId].sort();
                const { data: newC, error: cErr } = await supabase
                    .from('conversations')
                    .upsert({
                        participant_1: p1,
                        participant_2: p2,
                        last_message: type === 'text' ? text.substring(0, 50) : `Arquivo: ${type}`,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'participant_1,participant_2' })
                    .select()
                    .single();

                if (cErr) throw cErr;
                convId = newC.id;
                setActiveConvId(convId);
            }

            const { error: mErr } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: session.user.id,
                content: text,
                type: type
            });

            if (mErr) throw mErr;

            // Atualiza o last_message na conversa (silenciosamente)
            await supabase.from('conversations')
                .update({ last_message: type === 'text' ? text.substring(0, 50) : `Arquivo: ${type}`, updated_at: new Date().toISOString() })
                .eq('id', convId);

            // Fetch final para confirmar
            await fetchMessages(convId, true);
            fetchConversations();
        } catch (err: any) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Erro ao enviar. Verifique sua conexão.");
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        resolveChat();

        const channel = supabase
            .channel(`persistent_chat_${session.user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                if (activeConvIdRef.current === payload.new.conversation_id) {
                    fetchMessages(payload.new.conversation_id, true);
                    scrollToBottom();
                }
                fetchConversations();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations();
            })
            .subscribe();

        const heartBeat = setInterval(() => {
            if (activeConvIdRef.current) fetchMessages(activeConvIdRef.current, true);
            fetchConversations();
        }, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(heartBeat);
        };
    }, [initialBizId, session?.user?.id]);

    if (loading && !activeConvId && !recipient) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-black">
                <Loader2 className="animate-spin text-blue-600" size={30} />
            </div>
        );
    }

    const showList = !initialBizId && !activeConvId;

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden">
            {/* Header */}
            <div className="pt-12 pb-4 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {(!showList || (initialBizId && !activeConvId)) && (
                            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-white">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {recipient?.logo || activeConvId ? (
                                    <img src={recipient?.logo || conversations.find(c => c.id === activeConvId)?.other?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-blue-600" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-sm font-black uppercase dark:text-white tracking-tight">
                                    {showList ? 'Minhas Conversas' : (recipient?.name || 'Profissional')}
                                </h1>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                                    {showList ? `${conversations.length} contatos` : 'Conexão Ativa'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {!showList && (
                        <button onClick={() => activeConvId && fetchMessages(activeConvId)} className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 active:rotate-180 transition-all duration-500">
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-hidden relative">
                {showList ? (
                    <div className="h-full overflow-y-auto p-4 space-y-3 no-scrollbar">
                        {conversations.length > 0 ? conversations.map(c => (
                            <button key={c.id} onClick={() => { setActiveConvId(c.id); setRecipient(c.other); fetchMessages(c.id); }} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                    <img src={c.other?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase dark:text-white">{c.other?.name}</span>
                                        <span className="text-[9px] text-zinc-400 font-bold uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic mt-0.5">{c.last_message || 'Inicie a conversa...'}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-40">
                                <MessageSquare size={48} className="mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Nenhum chat por enquanto</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-5 no-scrollbar bg-slate-50 dark:bg-zinc-950/20">
                            {messages.map((m) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[85%] rounded-[1.8rem] px-5 py-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-white rounded-bl-none'}`}>
                                            {m.type === 'text' && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
                                            {m.type === 'image' && <img src={m.content} className="max-w-full rounded-2xl shadow-lg border border-white/10" />}
                                            {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-2xl shadow-lg" />}
                                            {m.type === 'audio' && (
                                                <div className="flex items-center gap-3">
                                                    <Mic size={14} className={isMe ? 'text-white/50' : 'text-blue-600'} />
                                                    <audio src={m.content} controls className="h-7 max-w-[110px]" />
                                                </div>
                                            )}
                                            <div className="flex justify-end mt-2 items-center gap-1 opacity-50">
                                                <span className="text-[8px] font-bold uppercase tracking-widest italic">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && <CheckCheck size={10} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 pb-10">
                            <div className="flex items-center gap-2 max-w-5xl mx-auto shadow-inner bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-1 px-3 border border-zinc-100 dark:border-white/5">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMessage)}
                                    placeholder="Mensagem profissional..."
                                    className="flex-1 h-12 bg-transparent border-none px-4 text-sm font-medium focus:ring-0 dark:text-white"
                                />
                                <button
                                    onClick={() => sendMessage(newMessage)}
                                    disabled={sending || !newMessage.trim()}
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg active:scale-90' : 'bg-transparent text-zinc-300'}`}
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;
