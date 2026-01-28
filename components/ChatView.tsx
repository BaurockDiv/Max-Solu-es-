
import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    ArrowLeft,
    CheckCheck,
    MessageSquare,
    Loader2,
    User,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

interface ChatViewProps {
    session: any;
    onBack: () => void;
    initialBizId?: string | null;
}

const ChatView: React.FC<ChatViewProps> = ({ session, onBack, initialBizId }) => {
    // 1. Estados Centrais
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [recipient, setRecipient] = useState<any>(null);

    // 2. Estados de Controle
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 100);
    };

    // 3. Funções de Busca com Alertas Críticos
    const fetchConversations = async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            const formatted = await Promise.all(data.map(async (c) => {
                const isP1 = c.participant_1 === session.user.id;
                const otherId = isP1 ? c.participant_2 : c.participant_1;

                const { data: biz } = await supabase
                    .from('businesses')
                    .select('name, logo, owner_id')
                    .eq('owner_id', otherId)
                    .maybeSingle();

                return {
                    ...c,
                    other: biz || { name: `Usuário (${otherId.substring(0, 4)})`, owner_id: otherId }
                };
            }));
            setConversations(formatted);
        } catch (err: any) {
            alert(`Erro na Lista de Conversas: ${err.message}`);
        }
    };

    const fetchMessages = async (id: string) => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data as Message[]);
            scrollToBottom('auto');
        } catch (err: any) {
            alert(`Erro ao Carregar Histórico: ${err.message}`);
        }
    };

    // 4. Efeito Especial: Sempre busca mensagens ao mudar o ID ativo
    useEffect(() => {
        if (activeConvId) {
            fetchMessages(activeConvId);
        }
    }, [activeConvId]);

    // 5. Inicialização (Resolve Chat Direto)
    useEffect(() => {
        const init = async () => {
            if (!session?.user?.id) return;
            setLoading(true);
            await fetchConversations();

            if (initialBizId) {
                // Tenta achar conversa existente
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_1.eq.${initialBizId},participant_2.eq.${session.user.id})`)
                    .maybeSingle();

                if (conv) {
                    setActiveConvId(conv.id);
                }

                // Busca dados do destinatário
                const { data: biz } = await supabase
                    .from('businesses')
                    .select('name, logo, owner_id')
                    .eq('owner_id', initialBizId)
                    .maybeSingle();
                setRecipient(biz || { name: 'Profissional', owner_id: initialBizId });
            }
            setLoading(false);
        };
        init();
    }, [initialBizId, session?.user?.id]);

    // 6. Realtime Persistente
    useEffect(() => {
        const channel = supabase
            .channel(`chat_realtime_${session?.user?.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                if (activeConvId === payload.new.conversation_id) {
                    fetchMessages(activeConvId);
                }
                fetchConversations();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeConvId]);

    const handleSendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !session?.user?.id) return;

        const targetId = initialBizId || recipient?.owner_id;
        if (!targetId) return;

        setSending(true);
        try {
            let convId = activeConvId;
            if (!convId) {
                const [p1, p2] = [session.user.id, targetId].sort();
                const { data: newC, error: cErr } = await supabase
                    .from('conversations')
                    .upsert({ participant_1: p1, participant_2: p2, last_message: text.substring(0, 50), updated_at: new Date().toISOString() }, { onConflict: 'participant_1,participant_2' })
                    .select().single();
                if (cErr) throw cErr;
                convId = newC.id;
                setActiveConvId(convId);
            }

            const { error: mErr } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: session.user.id,
                content: text
            });
            if (mErr) throw mErr;

            setNewMessage('');
            await fetchMessages(convId);
            fetchConversations();
        } catch (err: any) {
            alert(`Falha no Envio: ${err.message}`);
        } finally {
            setSending(false);
        }
    };

    if (loading && !activeConvId) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-black">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    const isListView = !initialBizId && !activeConvId;

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden relative">
            {/* Top Bar */}
            <div className="pt-12 pb-4 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {(!isListView || initialBizId) && (
                            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-white">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {recipient?.logo ? <img src={recipient.logo} className="w-full h-full object-cover" /> : <User size={20} className="text-blue-600" />}
                            </div>
                            <div>
                                <h1 className="text-sm font-black uppercase dark:text-white truncate max-w-[150px]">
                                    {isListView ? 'Minhas Conversas' : (recipient?.name || 'Profissional')}
                                </h1>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                                    {isListView ? `${conversations.length} Contatos` : 'Conexão Restaurada'}
                                </p>
                            </div>
                        </div>
                    </div>
                    {activeConvId && (
                        <button onClick={() => fetchMessages(activeConvId)} className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 active:rotate-180 transition-all duration-500">
                            <RefreshCw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {isListView ? (
                    <div className="h-full overflow-y-auto p-4 space-y-3">
                        {conversations.length > 0 ? conversations.map(c => (
                            <button key={c.id} onClick={() => { setRecipient(c.other); setActiveConvId(c.id); }} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                    <img src={c.other?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase dark:text-white">{c.other?.name}</span>
                                        <span className="text-[9px] text-zinc-400 font-medium uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic mt-0.5">{c.last_message || 'Abrir histórico...'}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 grayscale">
                                <MessageSquare size={48} className="mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Aguardando contatos</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-8 space-y-5 no-scrollbar bg-slate-50 dark:bg-zinc-950/20">
                            {messages.length === 0 && !sending && (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <AlertCircle size={40} className="mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center">Iniciando conexão segura...<br />Histórico será carregado</p>
                                </div>
                            )}
                            {messages.map((m) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[85%] rounded-[1.8rem] px-5 py-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 dark:text-white rounded-bl-none'}`}>
                                            <p className="text-sm font-medium leading-relaxed">{m.content}</p>
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

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 pb-10">
                            <div className="flex items-center gap-2 max-w-5xl mx-auto shadow-inner bg-zinc-50 dark:bg-zinc-800/50 rounded-[1.8rem] p-1 px-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Escreva como um profissional..."
                                    className="flex-1 h-12 bg-transparent border-none px-4 text-sm font-medium focus:ring-0 dark:text-white"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={sending || !newMessage.trim()}
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-300'}`}
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
