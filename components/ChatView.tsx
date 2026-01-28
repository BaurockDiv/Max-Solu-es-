
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
    X,
    User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types';

interface ChatViewProps {
    session: any;
    onBack: () => void;
    initialBizId?: string | null;
}

const ChatView: React.FC<ChatViewProps> = ({ session, onBack, initialBizId }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [targetRecipient, setTargetRecipient] = useState<any>(null);
    const [newMessage, setNewMessage] = useState('');
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const fetchMessages = async (convId: string) => {
        if (!convId) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
            scrollToBottom();
        }
    };

    const loadData = async () => {
        if (!session?.user?.id) return;

        try {
            console.log("Chat: Carregando dados para", session.user.id);
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

            const formatted = (convs || []).map(c => {
                const isP1 = c.participant_1 === session.user.id;
                const other = isP1 ? c.p2 : c.p1;
                return { ...c, other_participant: other };
            });

            setConversations(formatted);

            if (initialBizId) {
                console.log("Chat: Alvo detectado", initialBizId);
                const existing = formatted.find(c =>
                    c.participant_1 === initialBizId ||
                    c.participant_2 === initialBizId ||
                    (c.other_participant as any)?.owner_id === initialBizId
                );

                if (existing) {
                    setActiveConv(existing);
                    setTargetRecipient(null);
                    await fetchMessages(existing.id);
                } else {
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
            console.error("Chat: Erro ao carregar", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const channel = supabase
            .channel(`chat_updates_${session.user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
                if (activeConv && (payload.new as any).conversation_id === activeConv.id) {
                    fetchMessages(activeConv.id);
                }
                loadData();
            })
            .subscribe();

        const interval = setInterval(loadData, 20000);
        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [initialBizId, session?.user?.id]);

    const handleSend = async (content: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        if (!content.trim() && type === 'text') return;
        if (!session?.user?.id) return;

        const recipientId = activeConv
            ? (activeConv.participant_1 === session.user.id ? activeConv.participant_2 : activeConv.participant_1)
            : targetRecipient?.owner_id;

        if (!recipientId) return;

        const optimisticId = 'opt-' + Date.now();
        const optimisticMsg: any = {
            id: optimisticId,
            sender_id: session.user.id,
            content: content,
            type: type,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setSending(true);
        scrollToBottom();

        try {
            const [p1, p2] = [session.user.id, recipientId].sort();

            // 1. Garantir Conversa
            const { data: conv, error: cErr } = await supabase
                .from('conversations')
                .upsert({
                    participant_1: p1,
                    participant_2: p2,
                    last_message: type === 'text' ? content.substring(0, 50) : `Arquivo: ${type}`,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'participant_1,participant_2' })
                .select()
                .single();

            if (cErr) throw cErr;

            // 2. Enviar Mensagem
            const { error: mErr } = await supabase.from('messages').insert({
                conversation_id: conv.id,
                sender_id: session.user.id,
                content: content,
                type: type
            });

            if (mErr) throw mErr;

            if (targetRecipient) {
                await loadData();
            } else {
                fetchMessages(conv.id);
            }
        } catch (err: any) {
            console.error("Chat: Erro no envio", err);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            alert("Erro ao enviar mensagem.");
        } finally {
            setSending(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSending(true);
        try {
            const path = `chat/${session.user.id}/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
            const { error } = await supabase.storage.from('media').upload(path, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
            const type = file.type.startsWith('video') ? 'video' : 'image';
            await handleSend(publicUrl, type as any);
        } catch (err) {
            alert("Erro no upload.");
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const path = `chat/${session.user.id}/audio_${Date.now()}.webm`;
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
            alert("Acesso ao microfone negado.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setMediaRecorder(null);
            setRecording(false);
        }
    };

    if (loading && !activeConv && !targetRecipient) {
        return (
            <div className="h-full flex items-center justify-center bg-zinc-50 dark:bg-black">
                <Loader2 className="animate-spin text-blue-600" size={30} />
            </div>
        );
    }

    // Lógica de Separação de Contexto:
    // Se viemos de um perfil (initialBizId), queremos APENAS o chat, sem lista.
    const isDirectChat = !!initialBizId;
    const showList = !isDirectChat && !activeConv && !targetRecipient;

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden">
            {/* Header */}
            <div className="pt-12 pb-4 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Botão Voltar: Se for chat direto ou estiver em uma conversa, volta para onde o usuário estava */}
                        {(isDirectChat || activeConv || targetRecipient) && (
                            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {activeConv?.other_participant?.logo || targetRecipient?.logo ? (
                                    <img src={activeConv?.other_participant?.logo || targetRecipient?.logo} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-blue-600" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-base font-bold dark:text-white uppercase tracking-tight">
                                    {activeConv ? activeConv.other_participant?.name : (targetRecipient?.name || (showList ? 'Minhas Conversas' : 'Carregando...'))}
                                </h1>
                                <p className="text-[10px] font-medium text-blue-600 uppercase tracking-widest leading-none">
                                    {(activeConv || targetRecipient) ? 'Ativo agora' : `${conversations.length} conversas`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {showList ? (
                    /* Conversas */
                    <div className="h-full overflow-y-auto p-4 space-y-3 no-scrollbar">
                        {conversations.map(c => (
                            <button key={c.id} onClick={() => { setActiveConv(c); fetchMessages(c.id); }} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                    <img src={c.other_participant?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-tight dark:text-white">{c.other_participant?.name}</span>
                                        <span className="text-[9px] text-zinc-400 font-bold uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic">{c.last_message || 'Clique para iniciar...'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Chat */
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar bg-slate-50 dark:bg-black/20">
                            {messages.map((m) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:text-white rounded-bl-none'}`}>
                                            {m.type === 'text' && <p className="text-sm font-medium">{m.content}</p>}
                                            {m.type === 'image' && <img src={m.content} className="max-w-full rounded-xl" />}
                                            {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-xl" />}
                                            {m.type === 'audio' && (
                                                <div className="flex items-center gap-2">
                                                    <Mic size={14} />
                                                    <audio src={m.content} controls className="h-6 max-w-[100px]" />
                                                </div>
                                            )}
                                            <div className="flex justify-end items-center gap-1 mt-1">
                                                <span className="text-[8px] font-bold opacity-50 uppercase">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && <CheckCheck size={10} className="opacity-50" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 pb-10">
                            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*,video/*" />
                            <div className="flex items-center gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                    <Plus size={20} />
                                </button>

                                <div className="flex-1">
                                    {recording ? (
                                        <div className="h-11 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-between px-4">
                                            <span className="text-[10px] font-black text-red-600 uppercase animate-pulse">Gravando...</span>
                                            <button onClick={stopRecording} className="text-[10px] font-black uppercase text-red-600">Parar</button>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend(newMessage)}
                                            placeholder="Sua mensagem..."
                                            className="w-full h-11 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-4 text-sm font-medium focus:ring-1 focus:ring-blue-600 dark:text-white"
                                        />
                                    )}
                                </div>

                                {newMessage.trim() ? (
                                    <button onClick={() => handleSend(newMessage)} disabled={sending} className="p-3 bg-blue-600 rounded-2xl text-white">
                                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                ) : (
                                    <div className="flex gap-1">
                                        <button onClick={recording ? stopRecording : startRecording} className={`p-3 rounded-2xl ${recording ? 'bg-red-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                            <Mic size={20} />
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                            <ImageIcon size={20} />
                                        </button>
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
