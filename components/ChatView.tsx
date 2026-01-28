
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
    Video
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

interface ChatViewProps {
    session: any;
    onBack: () => void;
    initialBizId?: string | null; // Este é o OWNER_ID do outro usuário
}

const ChatView: React.FC<ChatViewProps> = ({ session, onBack, initialBizId }) => {
    // 1. ESTADOS DE DADOS
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [recipient, setRecipient] = useState<any>(null);

    // 2. ESTADOS DE UI
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // 3. BUSCAR OU CRIAR CONVERSA (A PEÇA CHAVE)
    const resolveChat = async () => {
        if (!session?.user?.id) return;
        setLoading(true);

        try {
            // Se viemos de um perfil, tentamos achar ou criar a conversa com aquele OWNER_ID
            if (initialBizId) {
                console.log("Sistema: Resolvendo chat direto com", initialBizId);

                // Busca perfil do destinatário para o Header
                const { data: biz } = await supabase
                    .from('businesses')
                    .select('name, logo, owner_id')
                    .eq('owner_id', initialBizId)
                    .maybeSingle();
                setRecipient(biz || { name: 'Profissional', owner_id: initialBizId });

                // Tenta achar conversa existente (A com B ou B com A)
                const { data: existing } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_1.eq.${initialBizId},participant_2.eq.${session.user.id})`)
                    .maybeSingle();

                if (existing) {
                    console.log("Sistema: Conversa encontrada ID", existing.id);
                    setActiveConvId(existing.id);
                    await fetchMessages(existing.id);
                } else {
                    console.log("Sistema: Preparado para nova conversa.");
                }
            } else {
                // Se não temos alvo, listamos as conversas do usuário
                await fetchConversations();
            }
        } catch (err) {
            console.error("Erro ao resolver chat:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchConversations = async () => {
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
                const other = c.participant_1 === session.user.id ? c.p2 : c.p1;
                return { ...c, other };
            });
            setConversations(formatted);
        }
    };

    const fetchMessages = async (id: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
            scrollToBottom();
        }
    };

    // 4. ENVIO ROBUSTO (PADRÃO WHATSAPP)
    const sendMessage = async (text: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        if (!text.trim() && type === 'text') return;
        if (!session?.user?.id) return;

        // O destinatário final
        const targetId = initialBizId || (recipient?.owner_id);
        if (!targetId) return;

        // UI Otimista
        const tempMsg: any = {
            id: 'temp-' + Date.now(),
            sender_id: session.user.id,
            content: text,
            type: type,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');
        setSending(true);
        scrollToBottom();

        try {
            let convId = activeConvId;

            // Se for o primeiro envio, criamos a conversa no banco
            if (!convId) {
                const [p1, p2] = [session.user.id, targetId].sort();
                const { data: newC, error: cErr } = await supabase
                    .from('conversations')
                    .upsert({
                        participant_1: p1,
                        participant_2: p2,
                        last_message: type === 'text' ? text.substring(0, 50) : `Arquivo: ${type}`
                    }, { onConflict: 'participant_1,participant_2' })
                    .select()
                    .single();

                if (cErr) throw cErr;
                convId = newC.id;
                setActiveConvId(newC.id);
            }

            // Grava a mensagem
            const { error: mErr } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: session.user.id,
                content: text,
                type: type
            });

            if (mErr) throw mErr;

            // Atualiza conversa
            await supabase.from('conversations')
                .update({ last_message: type === 'text' ? text.substring(0, 50) : `Arquivo: ${type}`, updated_at: new Date().toISOString() })
                .eq('id', convId);

        } catch (err) {
            console.error("Erro fatal no envio:", err);
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            alert("Erro ao enviar. Tente novamente.");
        } finally {
            setSending(false);
        }
    };

    // 5. EFEITOS E REAL-TIME
    useEffect(() => {
        resolveChat();

        const channel = supabase
            .channel(`chat_global_${session.user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (activeConvId && payload.new.conversation_id === activeConvId) {
                    fetchMessages(activeConvId);
                } else if (!initialBizId) {
                    fetchConversations();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [initialBizId, activeConvId]);

    // 6. RENDERIZAÇÃO SEPARADA
    if (loading && !activeConvId && !recipient) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-black">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    // LISTA DE MENSAGENS (Acessado pelo perfil)
    if (!initialBizId && !activeConvId) {
        return (
            <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
                <div className="pt-12 pb-6 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft size={20} /></button>
                        <h1 className="text-xl font-black uppercase italic dark:text-white">Minhas Mensagens</h1>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {conversations.length > 0 ? conversations.map(c => (
                        <button key={c.id} onClick={() => { setActiveConvId(c.id); setRecipient(c.other); fetchMessages(c.id); }} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                <img src={c.other?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="text-xs font-bold uppercase dark:text-white">{c.other?.name}</span>
                                <p className="text-[11px] text-zinc-500 line-clamp-1 italic">{c.last_message || 'Abrir conversa...'}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma conversa ativa</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // CHAT INDIVIDUAL (Acessado por perfil ou lista)
    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
            {/* Header Chat */}
            <div className="pt-12 pb-4 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"><ArrowLeft size={20} /></button>
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-zinc-800 shrink-0 overflow-hidden">
                            {recipient?.logo ? <img src={recipient.logo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-blue-600" />}
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase dark:text-white leading-none">{recipient?.name || 'Profissional'}</h2>
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">Conexão Segura</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balões */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar bg-slate-50 dark:bg-zinc-950/20">
                {messages.map((m) => {
                    const isMe = m.sender_id === session.user.id;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-white rounded-bl-none'}`}>
                                {m.type === 'text' && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
                                {m.type === 'image' && <img src={m.content} className="max-w-full rounded-xl" alt="Mídia" />}
                                {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-xl" />}
                                {m.type === 'audio' && (
                                    <div className="flex items-center gap-2">
                                        <Mic size={14} className={isMe ? 'text-white/50' : 'text-blue-600'} />
                                        <audio src={m.content} controls className="h-6 max-w-[100px]" />
                                    </div>
                                )}
                                <div className="flex justify-end mt-1 items-center gap-1 opacity-50">
                                    <span className="text-[8px] font-bold uppercase">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMe && <CheckCheck size={10} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Chat */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 pb-10">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMessage)}
                        placeholder="Escreva sua mensagem..."
                        className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 text-sm font-medium focus:ring-1 focus:ring-blue-600 dark:text-white"
                    />
                    <button
                        onClick={() => sendMessage(newMessage)}
                        disabled={sending || !newMessage.trim()}
                        className={`p-3 rounded-2xl transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
                    >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
