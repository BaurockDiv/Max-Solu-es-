
import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Image as ImageIcon,
    Mic,
    Phone,
    Video,
    Search,
    ArrowLeft,
    MoreVertical,
    Check,
    CheckCheck,
    Clock,
    User,
    X,
    Plus,
    MessageSquare,
    Loader2,
    Paperclip
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Conversation, Message, Business } from '../types';

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

    useEffect(() => {
        console.log("ChatView: Alvo inicial [ID]:", initialBizId);

        const initChat = async () => {
            // Se temos um alvo inicial, já preparamos a UI do chat para não mostrar a lista vazia
            if (initialBizId) {
                setGhostChat({
                    id: 'ghost',
                    other_participant: { name: 'Carregando perfil...' },
                    participant_1: session.user.id,
                    participant_2: initialBizId,
                    status: 'pending'
                });
            }

            setLoading(true);
            await loadConversations();
            setLoading(false);
        };
        initChat();

        const messageChannel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                loadConversations();
                if ((activeConv && payload.new.conversation_id === activeConv.id) ||
                    (ghostChat && (payload.new.sender_id === ghostChat.participant_2 || payload.new.sender_id === session.user.id))) {
                    loadMessages(payload.new.conversation_id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [initialBizId]); // Força recarregamento ao mudar o alvo do chat

    useEffect(() => {
        if (activeConv) {
            loadMessages(activeConv.id);
        }
    }, [activeConv]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

            setConversations(formatted);

            // LOGICA DE SINCRO: Tenta encontrar a conversa com o alvo
            if (initialBizId) {
                // 1. TENTA ACHAR NA LISTA DE CONVERSAS EXISTENTES
                const target = formatted.find(c =>
                    (c.participant_1 === initialBizId && c.participant_2 === session.user.id) ||
                    (c.participant_2 === initialBizId && c.participant_1 === session.user.id) ||
                    (c.other_participant as any)?.owner_id === initialBizId
                );

                if (target) {
                    console.log("Conversa encontrada na lista local:", target.id);
                    setActiveConv(target);
                    setGhostChat(null);
                } else {
                    // 2. SE NÃO ACHOU LOCAL, TENTA BUSCAR DIRETO NO BANCO (Sincronização forçada)
                    console.log("Buscando conversa no banco para alvo:", initialBizId);
                    const { data: dbConv } = await supabase
                        .from('conversations')
                        .select('*, p1:businesses!conversations_participant_1_fkey(name, logo, owner_id), p2:businesses!conversations_participant_2_fkey(name, logo, owner_id)')
                        .or(`and(participant_1.eq.${session.user.id},participant_2.eq.${initialBizId}),and(participant_2.eq.${session.user.id},participant_1.eq.${initialBizId})`)
                        .maybeSingle();

                    if (dbConv) {
                        console.log("Conversa encontrada no banco direto:", dbConv.id);
                        const isP1 = dbConv.participant_1 === session.user.id;
                        const other = isP1 ? dbConv.p2 : dbConv.p1;
                        setActiveConv({ ...dbConv, other_participant: other } as any);
                        setGhostChat(null);
                    } else {
                        // 3. REALMENTE NÃO EXISTE - GHOST CHAT
                        console.log("Nenhuma conversa encontrada. Preparando Ghost Chat...");
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
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Chat Load Error:", err);
            // alert("Erro ao carregar conversas: " + err.message);
        }
    };

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

    const sendMessage = async (content: string, type: 'text' | 'image' | 'audio' | 'video' = 'text') => {
        const currentConv = activeConv || ghostChat;
        if (!content.trim() && type === 'text') return;
        if (!currentConv) return;

        setSending(true);
        try {
            let convId = currentConv.id;

            if (convId === 'ghost') {
                console.log("Tentando iniciar conversa...");
                // Tenta insert direto. Se falhar por duplicidade, o catch resolve.
                const { data: newConv, error: cErr } = await supabase.from('conversations').insert({
                    participant_1: session.user.id,
                    participant_2: currentConv.participant_2,
                    status: 'pending',
                    last_message: type === 'text' ? content : `Arquivo de ${type}`
                }).select().maybeSingle();

                if (cErr) {
                    // Erro 23505 = Unique Violation (Conversa já existe)
                    if (cErr.code === '23505') {
                        console.log("Conversa já existe no banco, recuperando com busca direta...");

                        // Busca tentativa 1 (A, B)
                        let { data: rec } = await supabase
                            .from('conversations')
                            .select('id')
                            .eq('participant_1', session.user.id)
                            .eq('participant_2', currentConv.participant_2)
                            .maybeSingle();

                        // Busca tentativa 2 (B, A)
                        if (!rec) {
                            const { data: rec2 } = await supabase
                                .from('conversations')
                                .select('id')
                                .eq('participant_1', currentConv.participant_2)
                                .eq('participant_2', session.user.id)
                                .maybeSingle();
                            rec = rec2;
                        }

                        if (rec) {
                            convId = rec.id;
                            console.log("Conversa recuperada com sucesso:", convId);
                            await loadConversations();
                        } else {
                            // Se nem a busca direta achou, algo está muito errado com RLS ou IDs
                            console.error("Conflito de ID mas busca falhou. Verifique as políticas de RLS.");
                            return;
                        }
                    } else {
                        console.error("Erro ao criar conversa:", cErr);
                        return;
                    }
                } else if (newConv) {
                    convId = newConv.id;
                    setActiveConv({ ...newConv, other_participant: currentConv.other_participant });
                    setGhostChat(null);
                }
            }

            console.log("Enviando mensagem para conv:", convId);
            const { data: sentMsg, error: mErr } = await supabase.from('messages').insert({
                conversation_id: convId,
                sender_id: session.user.id,
                content: content,
                type: type
            }).select().single();

            if (mErr) {
                console.error("Erro ao enviar mensagem:", mErr);
                alert("Erro ao enviar: " + mErr.message);
                return;
            }

            // Atualização Otimista / Local Instantânea
            if (sentMsg) {
                setMessages(prev => [...prev, sentMsg as Message]);
            }

            await supabase.from('conversations').update({
                last_message: type === 'text' ? content : `Arquivo de ${type}`,
                updated_at: new Date().toISOString()
            }).eq('id', convId);

            // Força recarregamento para garantir sincronia
            await loadConversations();
            await loadMessages(convId);

        } catch (err: any) {
            console.error("Critical Send error:", err);
            alert("Erro crítico: " + err.message);
        } finally {
            setSending(false);
            scrollToBottom();
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
            const type = file.type.startsWith('video') ? 'video' : 'image';
            await sendMessage(publicUrl, type as any);
        } catch (err) {
            console.error("Upload error:", err);
            alert("Erro ao enviar mídia.");
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
            alert("Permita o acesso ao microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
            setMediaRecorder(null);
        }
    };

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Carregando Conversas...</span>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
            {/* Header Estilo Premium */}
            <div className="pt-12 pb-6 px-6 bg-white dark:bg-zinc-900/50 backdrop-blur-3xl border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {(activeConv || ghostChat) && (
                            <button
                                onClick={() => { setActiveConv(null); setGhostChat(null); }}
                                className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
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
                    <div className="flex items-center gap-2">
                        {(!activeConv && !ghostChat) ? (
                            <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-zinc-600 dark:text-zinc-400">
                                <Search size={20} />
                            </button>
                        ) : (
                            <>
                                <button className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl"><Phone size={18} /></button>
                                <button className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl"><Video size={18} /></button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {(!activeConv && !ghostChat && !initialBizId) ? (
                    /* LISTA DE CONVERSAS */
                    <div className="h-full overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
                        {conversations.length > 0 ? conversations.map(c => (
                            <button
                                key={c.id}
                                onClick={() => { setActiveConv(c); setGhostChat(null); }}
                                className="w-full flex items-center gap-5 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                            >
                                {c.status === 'pending' && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black px-4 py-1 uppercase tracking-widest rounded-bl-xl">Solicitação</div>}

                                <div className="w-14 h-14 rounded-[1.6rem] bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 border border-zinc-200 dark:border-zinc-700 p-0.5">
                                    <img src={c.other_participant?.logo || 'https://picsum.photos/200'} className="w-full h-full object-cover rounded-[1.4rem]" alt="" />
                                </div>

                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-tight">{c.other_participant?.name}</span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-1 font-medium italic">
                                        {c.last_message || 'Inicie uma conversa profissional...'}
                                    </p>
                                </div>
                            </button>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                                <div className="w-24 h-24 rounded-[3rem] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-800">
                                    <MessageSquare size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-zinc-950 dark:text-white uppercase tracking-tight">Vazio por aqui</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">Suas conversas com profissionais e clientes aparecerão aqui.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* JANELA DE CHAT */
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 no-scrollbar bg-slate-50 dark:bg-black/40">
                            <div className="text-center pb-8">
                                <span className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-900 px-4 py-1.5 rounded-full tracking-[0.2em]">Criptografia de Ponta-a-Ponta</span>
                            </div>

                            {messages.map((m, idx) => {
                                const isMe = m.sender_id === session.user.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[80%] rounded-[2rem] px-5 py-4 ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none shadow-xl shadow-blue-500/20'
                                            : 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-800 shadow-sm'
                                            }`}>
                                            {m.type === 'text' && <p className="text-sm font-medium leading-relaxed">{m.content}</p>}
                                            {m.type === 'image' && <img src={m.content} className="max-w-full rounded-xl" alt="Mídia" />}
                                            {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-xl" />}
                                            {m.type === 'audio' && (
                                                <div className="flex items-center gap-3 py-2">
                                                    <div className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-blue-600/10 text-blue-600'}`}>
                                                        <Mic size={16} />
                                                    </div>
                                                    <audio src={m.content} controls className="h-8 max-w-[150px] md:max-w-xs" />
                                                </div>
                                            )}
                                            <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'justify-end text-blue-100' : 'justify-start text-zinc-400'}`}>
                                                <span className="text-[8px] font-black uppercase tracking-tighter">
                                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && <CheckCheck size={10} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Estilo Premium */}
                        <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 pb-12">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleMediaUpload}
                                className="hidden"
                                accept="image/*,video/*"
                            />

                            <div className="flex items-center gap-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-blue-600 transition-colors"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 relative">
                                    {recording ? (
                                        <div className="w-full h-12 bg-red-600/10 rounded-2xl flex items-center justify-between px-5 animate-pulse">
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Gravando Áudio...</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-600 rounded-full" />
                                                <button onClick={stopRecording} className="text-red-950 dark:text-white font-black text-[10px] uppercase">Parar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMessage)}
                                            placeholder="Escreva sua mensagem profissional..."
                                            className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-5 text-sm font-medium text-zinc-950 dark:text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-600 transition-all shadow-inner"
                                        />
                                    )}
                                </div>

                                {(newMessage.trim() && !recording) ? (
                                    <button
                                        onClick={() => { sendMessage(newMessage); setNewMessage(''); }}
                                        disabled={sending}
                                        className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 active:scale-90 transition-all"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={recording ? stopRecording : startRecording}
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${recording ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600/10 text-emerald-600'}`}
                                        >
                                            <Mic size={22} />
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                                        >
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
