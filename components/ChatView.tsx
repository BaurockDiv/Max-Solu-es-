
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
    Loader2
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
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [ghostChat, setGhostChat] = useState<any>(null);
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async (convId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data as Message[]);
        }
    };

    const loadConversations = async () => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                  *,
                  p1:businesses!conversations_participant_1_fkey(name, logo, owner_id),
                  p2:businesses!conversations_participant_2_fkey(name, logo, owner_id)
                `)
                .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map(c => {
                const isP1 = c.participant_1 === session.user.id;
                const other = isP1 ? c.p2 : c.p1;
                return { ...c, other_participant: other };
            });

            setConversations(formatted);

            if (initialBizId) {
                const target = formatted.find(c =>
                    (c.participant_1 === initialBizId && c.participant_2 === session.user.id) ||
                    (c.participant_2 === initialBizId && c.participant_1 === session.user.id) ||
                    (c.other_participant as any)?.owner_id === initialBizId
                );

                if (target) {
                    setActiveConv(target);
                    setGhostChat(null);
                    await loadMessages(target.id);
                } else {
                    const { data: dbConv } = await supabase
                        .from('conversations')
                        .select('*, p1:businesses!conversations_participant_1_fkey(name, logo, owner_id), p2:businesses!conversations_participant_2_fkey(name, logo, owner_id)')
                        .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_2.eq.${session.user.id},participant_1.eq.${initialBizId})`)
                        .maybeSingle();

                    if (dbConv) {
                        const isP1 = dbConv.participant_1 === session.user.id;
                        const other = isP1 ? dbConv.p2 : dbConv.p1;
                        setActiveConv({ ...dbConv, other_participant: other } as any);
                        setGhostChat(null);
                        await loadMessages(dbConv.id);
                    } else {
                        const { data: biz } = await supabase
                            .from('businesses')
                            .select('name, logo, owner_id, id')
                            .or(`owner_id.eq.${initialBizId},id.eq.${initialBizId}`)
                            .maybeSingle();

                        if (biz) {
                            setGhostChat({
                                id: 'ghost',
                                other_participant: biz,
                                participant_1: session.user.id,
                                participant_2: biz.owner_id,
                                status: 'pending'
                            });
                        } else {
                            setGhostChat({
                                id: 'ghost',
                                other_participant: { name: 'Profissional' },
                                participant_1: session.user.id,
                                participant_2: initialBizId,
                                status: 'pending'
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Chat Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();

        const messageChannel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (activeConv && payload.new.conversation_id === activeConv.id) {
                    loadMessages(payload.new.conversation_id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [initialBizId]);

    useEffect(() => {
        if (activeConv) {
            loadMessages(activeConv.id);
        }
    }, [activeConv]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (content: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        const currentConv = activeConv || ghostChat;
        if (!content.trim() && type === 'text') return;
        if (!currentConv) return;

        // Optimistic update
        const optimisticMsg: Message = {
            id: 'temp-' + Date.now(),
            conversation_id: currentConv.id,
            sender_id: session.user.id,
            content: content,
            type: type,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        setSending(true);
        try {
            let convId = currentConv.id;

            if (convId === 'ghost') {
                const { data: newConv, error: cErr } = await supabase.from('conversations').insert({
                    participant_1: session.user.id,
                    participant_2: currentConv.participant_2,
                    status: 'pending',
                    last_message: type === 'text' ? content.substring(0, 50) : `Arquivo de ${type}`
                }).select().maybeSingle();

                if (cErr && cErr.code === '23505') {
                    // Recover existing
                    const { data: rec } = await supabase
                        .from('conversations')
                        .select('id')
                        .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${currentConv.participant_2}),and(participant_2.eq.${session.user.id},participant_1.eq.${currentConv.participant_2})`)
                        .maybeSingle();
                    if (rec) convId = rec.id;
                } else if (newConv) {
                    convId = newConv.id;
                }
            }

            if (convId && convId !== 'ghost') {
                const { error: mErr } = await supabase.from('messages').insert({
                    conversation_id: convId,
                    sender_id: session.user.id,
                    content: content,
                    type: type
                });

                if (!mErr) {
                    await supabase.from('conversations').update({
                        last_message: type === 'text' ? content.substring(0, 50) : `Arquivo de ${type}`,
                        updated_at: new Date().toISOString()
                    }).eq('id', convId);

                    if (ghostChat) {
                        await loadConversations();
                    } else {
                        await loadMessages(convId);
                    }
                }
            }
        } catch (err) {
            console.error("Send error:", err);
        } finally {
            setSending(false);
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSending(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `chat/${Date.now()}.${fileExt}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
            await sendMessage(publicUrl, file.type.startsWith('video') ? 'video' : 'image');
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const fileName = `chat/audio-${Date.now()}.webm`;
                const { data, error } = await supabase.storage.from('media').upload(fileName, audioBlob);
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
                    await sendMessage(publicUrl, 'audio');
                }
                stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
        } catch (err) {
            console.error("Mic error:", err);
            alert("Permita o microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
            setMediaRecorder(null);
        }
    };

    if (loading && !activeConv && !ghostChat) return (
        <div className="h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando...</span>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black font-sans">
            <div className="pt-12 pb-6 px-6 bg-white dark:bg-zinc-900/50 backdrop-blur-3xl border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {(activeConv || ghostChat) && (
                            <button onClick={() => { setActiveConv(null); setGhostChat(null); setMessages([]); }} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter italic">
                                {activeConv ? activeConv.other_participant?.name : (ghostChat?.other_participant?.name || 'Mensagens')}
                            </h1>
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                                {activeConv || ghostChat ? 'Online agora' : `${conversations.length} conversas ativas`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {(!activeConv && !ghostChat && !initialBizId) ? (
                    <div className="h-full overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
                        {conversations.length > 0 ? conversations.map(c => (
                            <button key={c.id} onClick={() => setActiveConv(c)} className="w-full flex items-center gap-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm">
                                <div className="w-14 h-14 rounded-[1.6rem] bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200 dark:border-zinc-700 p-0.5">
                                    <img src={c.other_participant?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover rounded-[1.4rem]" alt="" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight">{c.other_participant?.name}</span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-1 font-medium italic">{c.last_message || 'Inicie uma conversa...'}</p>
                                </div>
                            </button>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                <MessageSquare size={48} className="text-zinc-300 dark:text-zinc-800" />
                                <h3 className="text-lg font-black text-zinc-950 dark:text-white uppercase tracking-tight">Vazio por aqui</h3>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 no-scrollbar bg-slate-50 dark:bg-black/40">
                            {messages.map((m) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-[2rem] px-5 py-4 ${isMe ? 'bg-blue-600 text-white rounded-br-none shadow-xl' : 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-800'}`}>
                                            {m.type === 'text' && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
                                            {m.type === 'image' && <img src={m.content} className="max-w-full rounded-xl" alt="Mídia" />}
                                            {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-xl" />}
                                            {m.type === 'audio' && <audio src={m.content} controls className="h-8 max-w-[150px]" />}
                                            <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end text-blue-100' : 'text-zinc-400'} text-[8px] font-black uppercase tracking-tighter`}>
                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <CheckCheck size={10} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 pb-12">
                            <input type="file" ref={fileInputRef} onChange={handleMediaUpload} className="hidden" accept="image/*,video/*" />
                            <div className="flex items-center gap-3">
                                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-blue-600 transition-colors">
                                    <Plus size={24} />
                                </button>
                                <div className="flex-1 relative">
                                    {recording ? (
                                        <div className="w-full h-12 bg-red-600/10 rounded-2xl flex items-center justify-between px-5 animate-pulse text-red-600 font-black text-[10px] uppercase">
                                            <span>Gravando...</span>
                                            <button onClick={stopRecording}>Parar</button>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMessage)}
                                            placeholder="Escreva sua mensagem..."
                                            className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-5 text-sm font-medium text-zinc-950 dark:text-white"
                                        />
                                    )}
                                </div>
                                {newMessage.trim() && !recording ? (
                                    <button onClick={() => sendMessage(newMessage)} disabled={sending} className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={recording ? stopRecording : startRecording} className={`w-12 h-12 rounded-2xl flex items-center justify-center ${recording ? 'bg-red-600 text-white' : 'bg-emerald-600/10 text-emerald-600'}`}>
                                            <Mic size={22} />
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                            <ImageIcon size={22} />
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
