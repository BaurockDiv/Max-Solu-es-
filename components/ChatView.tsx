
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

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // 1. CARREGAR MENSAGENS E FORÇAR ATUALIZAÇÃO
    const fetchMessages = async (id: string) => {
        if (!id) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });

        if (!error && data) {
            console.log(`Chat: Mensagens carregadas (${data.length}) para ${id}`);
            setMessages(data as Message[]);
            scrollToBottom();
        }
    };

    // 2. BUSCAR CONVERSAS (LISTA GERAL)
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

    // 3. INICIALIZAÇÃO OU RESOLUÇÃO DE CHAT DIRETO
    const resolveChat = async () => {
        if (!session?.user?.id) return;
        setLoading(true);

        try {
            if (initialBizId) {
                // Busca perfil do destinatário
                const { data: biz } = await supabase
                    .from('businesses')
                    .select('name, logo, owner_id')
                    .eq('owner_id', initialBizId)
                    .maybeSingle();
                setRecipient(biz || { name: 'Profissional', owner_id: initialBizId });

                // Busca conversa existente (Independente da ordem de IDs)
                const { data: existing } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_1.eq.${initialBizId},participant_2.eq.${session.user.id})`)
                    .maybeSingle();

                if (existing) {
                    setActiveConvId(existing.id);
                    await fetchMessages(existing.id);
                } else {
                    setMessages([]); // Limpa mensagens se for novo contato
                }
            } else {
                await fetchConversations();
            }
        } catch (err) {
            console.error("Erro ao resolver chat:", err);
        } finally {
            setLoading(false);
        }
    };

    // 4. ENVIO ATÔMICO COM VERIFICAÇÃO DE PERSISTÊNCIA
    const sendMessage = async (text: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        if (!text.trim() && type === 'text') return;
        if (!session?.user?.id) return;

        const targetId = initialBizId || recipient?.owner_id;
        if (!targetId) return;

        // UI Otimista
        const tempMsgId = 'temp-' + Date.now();
        const optimisticMsg: any = {
            id: tempMsgId,
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

            // Criação/Recuperação de Conversa (UPSERT Blindado)
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

            // Inserção da Mensagem Real
            const { error: mErr } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: session.user.id,
                content: text,
                type: type
            });

            if (mErr) throw mErr;

            // Força recarregamento imediato para confirmar persistência
            await fetchMessages(convId);
            if (!initialBizId) await fetchConversations();

        } catch (err: any) {
            console.error("Erro ao enviar:", err);
            setMessages(prev => prev.filter(m => m.id !== tempMsgId));
            alert("Falha na gravação da mensagem. Verifique sua conexão.");
        } finally {
            setSending(false);
        }
    };

    // 5. ESCUTA EM TEMPO REAL (REAL-TIME BROADCAST)
    useEffect(() => {
        resolveChat();

        // Canal de escuta simplificado e robusto
        const channel = supabase
            .channel(`universal_chat_${session.user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages'
            }, (payload: any) => {
                console.log("Realtime: Alteração detectada em Mensagens", payload);

                // Se o chat ativo está aberto, atualiza mensagens
                if (activeConvId &&
                    (payload.new.conversation_id === activeConvId ||
                        payload.old?.conversation_id === activeConvId)) {
                    fetchMessages(activeConvId);
                }

                // Sempre atualiza a lista de conversas para o "last_message"
                fetchConversations();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations'
            }, (payload: any) => {
                console.log("Realtime: Alteração detectada em Conversas", payload);
                fetchConversations();
            })
            .subscribe((status) => {
                console.log("CONEXÃO REALTIME STATUS:", status);
                if (status === 'SUBSCRIBED') {
                    console.log("Chat: Sincronização viva e pronta.");
                }
            });

        // Fallback redundante para garantir que nada passe
        const pulse = setInterval(() => {
            if (activeConvId) fetchMessages(activeConvId);
            fetchConversations();
        }, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pulse);
        };
    }, [initialBizId, activeConvId, session?.user?.id]);

    if (loading && !activeConvId && !recipient) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-black">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    // INTERFACE: LISTA DE CONVERSAS
    if (!initialBizId && !activeConvId) {
        return (
            <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
                <div className="pt-12 pb-6 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-white"><ArrowLeft size={20} /></button>
                        <h1 className="text-xl font-black uppercase italic dark:text-white">Central de Mensagens</h1>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {conversations.length > 0 ? conversations.map(c => (
                        <button key={c.id} onClick={() => { setActiveConvId(c.id); setRecipient(c.other); fetchMessages(c.id); }} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                {c.other?.logo ? <img src={c.other.logo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-zinc-300" />}
                            </div>
                            <div className="flex-1 text-left">
                                <span className="text-xs font-bold uppercase dark:text-white leading-none">{c.other?.name}</span>
                                <p className="text-[11px] text-zinc-500 line-clamp-1 italic mt-1">{c.last_message || 'Ver conversa...'}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20 grayscale">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Sem conversas ativas no momento</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // INTERFACE: JANELA DE CHAT
    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
            <div className="pt-12 pb-4 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"><ArrowLeft size={20} /></button>
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-zinc-800 shrink-0 overflow-hidden">
                            {recipient?.logo ? <img src={recipient.logo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-blue-600" />}
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase dark:text-white leading-none">{recipient?.name || 'Profissional'}</h2>
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1 italic">Conexão Ativa</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar bg-slate-50 dark:bg-zinc-950/40">
                {messages.length === 0 && !sending && (
                    <div className="text-center py-10 opacity-30">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Inicie sua conversa profissional</p>
                    </div>
                )}
                {messages.map((m) => {
                    const isMe = m.sender_id === session.user.id;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}>
                            <div className={`max-w-[85%] rounded-[1.8rem] px-5 py-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-white rounded-bl-none'}`}>
                                {m.type === 'text' && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
                                {m.type === 'image' && <img src={m.content} className="max-w-full rounded-2xl shadow-sm border border-black/5" alt="Mídia" />}
                                {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-2xl shadow-sm" />}
                                {m.type === 'audio' && (
                                    <div className="flex items-center gap-2">
                                        <Mic size={14} className={isMe ? 'text-white/50' : 'text-blue-600'} />
                                        <audio src={m.content} controls className="h-6 max-w-[120px]" />
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
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMessage)}
                        placeholder="Digite sua mensagem profissional..."
                        className="flex-1 h-12 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 text-sm font-medium focus:ring-1 focus:ring-blue-600 dark:text-white shadow-inner"
                    />
                    <button
                        onClick={() => sendMessage(newMessage)}
                        disabled={sending || !newMessage.trim()}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg active:scale-90' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
                    >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
