import { useState, useEffect, useRef, useCallback } from 'react';
import { FileAttachment } from '../chat/FileAttachment';
import { FileDrop } from '../chat/FileDrop';
import { useFileUpload, type UploadedFile } from '../../hooks/useFileUpload';
import { useDMStore, type DMAttachment } from '../../stores/dmStore';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';

export interface DMUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function uploadedToAttachment(u: UploadedFile): DMAttachment {
  return {
    id: u.file_id,
    filename: u.filename,
    url: u.file_url,
    content_type: u.content_type,
    size: u.size,
  };
}

export function DMConversation({
  dmId,
  recipient,
  mobile = false,
}: {
  dmId: string;
  recipient: DMUser;
  mobile?: boolean;
}) {
  const [input, setInput] = useState('');
  const [recipientTyping, setRecipientTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, loadMessages, sendMessage, addMessage } = useDMStore();
  const { user: me } = useAuthStore();
  const socket = useSocket();
  const { upload, uploading, progress } = useFileUpload();

  const dmMessages = messages[dmId] ?? [];

  // Load messages on mount / dmId change
  useEffect(() => {
    loadMessages(dmId);
  }, [dmId, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages.length]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onMsg = (msg: any) => {
      if (msg.dm_channel_id === dmId || msg.channelId === dmId) {
        addMessage(dmId, {
          id: msg.id,
          author_id: msg.authorId ?? msg.author_id,
          content: msg.content ?? '',
          attachments: msg.attachments ?? [],
          created_at: msg.createdAt ?? msg.created_at ?? new Date().toISOString(),
        });
      }
    };

    const onTyping = ({ user_id, typing }: { dm_channel_id: string; user_id: string; typing: boolean }) => {
      if (user_id === recipient.id) setRecipientTyping(typing);
    };

    socket.on('dm:message:new', onMsg);
    socket.on('dm:typing:update', onTyping);

    // Join the DM room for typing events
    socket.emit('dm:join', { dm_channel_id: dmId });

    return () => {
      socket.off('dm:message:new', onMsg);
      socket.off('dm:typing:update', onTyping);
      socket.emit('dm:leave', { dm_channel_id: dmId });
    };
  }, [socket, dmId, recipient.id, addMessage]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!typingRef.current && value.length > 0) {
      typingRef.current = true;
      socket?.emit('dm:typing:start', { dm_channel_id: dmId });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      socket?.emit('dm:typing:stop', { dm_channel_id: dmId });
    }, 3000);
  };

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingRef.current = false;
    socket?.emit('dm:typing:stop', { dm_channel_id: dmId });
    try {
      await sendMessage(dmId, content);
    } catch (err) {
      console.error('[DM] sendMessage error:', err);
    }
  }, [input, dmId, sendMessage, socket]);

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        const uploaded = await upload(file);
        await sendMessage(dmId, '', [uploadedToAttachment(uploaded)]);
      } catch (err) {
        console.error('[DM] upload error:', err);
      }
    }
  };

  return (
    <FileDrop onFiles={handleFiles}>
      <section className="glass-slab rounded-lg flex flex-col h-full overflow-hidden">

        {/* Header — hidden on mobile (MobileHeader handles it) */}
        {!mobile && (
          <header className="px-12 py-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02] shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                {recipient.displayName}
                {recipient.status === 'online' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-accent shadow-[0_0_6px_#d9f99d]" />
                )}
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                Primary Core Communication Channel
              </p>
            </div>
            <div className="flex gap-4">
              <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">videocam</span>
              </button>
              <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">info</span>
              </button>
            </div>
          </header>
        )}

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar touch-scroll ${mobile ? 'px-4 py-4' : 'px-12 py-8'}`}>
          {dmMessages.map((msg, i) => {
            const isMe = msg.author_id === me?.id;
            return (
              <div key={msg.id}>
                {i > 0 && <div className="chat-separator" />}
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${
                        isMe ? 'text-violet-accent' : 'text-white/50'
                      }`}
                    >
                      {isMe ? 'You' : recipient.displayName}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                  {msg.content && (
                    <p className="text-lg text-slate-100 font-light leading-relaxed max-w-3xl">
                      {msg.content}
                    </p>
                  )}
                  {msg.attachments?.map((att) => (
                    <FileAttachment
                      key={att.id}
                      attachment={{
                        id: att.id,
                        filename: att.filename,
                        url: att.url,
                        content_type: att.content_type,
                        size: att.size,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {recipientTyping && (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
              <span className="text-[11px] italic">{recipient.displayName} is transmitting...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div className={`${mobile ? 'px-4' : 'px-12'} py-1 shrink-0`}>
            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-accent transition-all duration-200 shadow-[0_0_6px_#d9f99d]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Input — violet variant */}
        <div className={`${mobile ? 'px-4 py-3' : 'px-12 py-6'} shrink-0`}>
          <div className="floating-input">
            <label className="text-slate-500 hover:text-lime-accent transition-colors shrink-0 cursor-pointer">
              <span className="material-symbols-outlined">attach_file</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) handleFiles(files);
                  e.target.value = '';
                }}
              />
            </label>
            <input
              className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 text-base outline-none"
              placeholder="Transmit neural message..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center gap-4 shrink-0">
              <button className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">sentiment_satisfied</span>
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl bg-violet-accent flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>

      </section>
    </FileDrop>
  );
}
