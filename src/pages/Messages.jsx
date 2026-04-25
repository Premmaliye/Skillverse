import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Send, Sparkles, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function sortUserPair(firstId, secondId) {
  return firstId < secondId ? [firstId, secondId] : [secondId, firstId];
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitial(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [threads, setThreads] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const messagesBottomRef = useRef(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const selectedUserId = useMemo(() => {
    if (!selectedThread || !currentUserId) {
      return '';
    }

    return selectedThread.user_a === currentUserId ? selectedThread.user_b : selectedThread.user_a;
  }, [selectedThread, currentUserId]);

  const selectedUserProfile = selectedUserId ? profilesMap[selectedUserId] : null;

  const filteredThreads = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) {
      return threads;
    }

    return threads.filter((thread) => {
      const partnerId = thread.user_a === currentUserId ? thread.user_b : thread.user_a;
      const partner = profilesMap[partnerId];
      const haystack = `${partner?.username || ''} ${partner?.city || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [conversationSearch, threads, currentUserId, profilesMap]);

  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    const { data, error: messagesError } = await supabase
      .from('direct_messages')
      .select('id, thread_id, sender_id, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      setError(messagesError.message || 'Unable to load messages.');
      setMessages([]);
      return;
    }

    setMessages(Array.isArray(data) ? data : []);
  }, []);

  const ensureThread = useCallback(async (viewerId, otherUserId) => {
    if (!viewerId || !otherUserId || viewerId === otherUserId) {
      return null;
    }

    const [userA, userB] = sortUserPair(viewerId, otherUserId);

    const { data: existingThread } = await supabase
      .from('direct_message_threads')
      .select('id, user_a, user_b, updated_at, created_at')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle();

    if (existingThread) {
      return existingThread;
    }

    const { error: createError } = await supabase
      .from('direct_message_threads')
      .upsert(
        { user_a: userA, user_b: userB },
        { onConflict: 'user_a,user_b', ignoreDuplicates: true }
      );

    // In concurrent starts, another request may create the row first.
    // If the unique pair already exists, continue by reading it.
    if (createError && createError.code !== '23505') {
      setError(createError.message || 'Unable to create conversation.');
      return null;
    }

    const { data: insertedThread, error: fetchError } = await supabase
      .from('direct_message_threads')
      .select('id, user_a, user_b, updated_at, created_at')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .single();

    if (fetchError) {
      setError(fetchError.message || 'Unable to load conversation.');
      return null;
    }

    return insertedThread;
  }, []);

  const loadThreads = useCallback(async (viewerId, preferredUserId = '') => {
    if (!viewerId) {
      return;
    }

    const { data: threadData, error: threadError } = await supabase
      .from('direct_message_threads')
      .select('id, user_a, user_b, updated_at, created_at')
      .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`)
      .order('updated_at', { ascending: false });

    if (threadError) {
      setError(threadError.message || 'Unable to load conversations.');
      setThreads([]);
      return;
    }

    let nextThreads = Array.isArray(threadData) ? threadData : [];

    if (preferredUserId) {
      const existingPreferred = nextThreads.find((thread) =>
        (thread.user_a === viewerId && thread.user_b === preferredUserId) ||
        (thread.user_b === viewerId && thread.user_a === preferredUserId)
      );

      if (!existingPreferred) {
        const createdThread = await ensureThread(viewerId, preferredUserId);
        if (createdThread) {
          nextThreads = [createdThread, ...nextThreads];
        }
      }
    }

    nextThreads.sort((first, second) => new Date(second.updated_at) - new Date(first.updated_at));
    setThreads(nextThreads);

    const counterpartIds = nextThreads.map((thread) =>
      thread.user_a === viewerId ? thread.user_b : thread.user_a
    );

    if (counterpartIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, city')
        .in('id', counterpartIds);

      const nextMap = {};
      (profileData || []).forEach((profile) => {
        nextMap[profile.id] = profile;
      });
      setProfilesMap(nextMap);
    } else {
      setProfilesMap({});
    }

    if (preferredUserId) {
      const preferredThread = nextThreads.find((thread) =>
        (thread.user_a === viewerId && thread.user_b === preferredUserId) ||
        (thread.user_b === viewerId && thread.user_a === preferredUserId)
      );

      if (preferredThread) {
        setSelectedThreadId(preferredThread.id);
        await loadMessages(preferredThread.id);
        return;
      }
    }

    if (nextThreads.length > 0) {
      const defaultThreadId = nextThreads[0].id;
      setSelectedThreadId(defaultThreadId);
      await loadMessages(defaultThreadId);
    } else {
      setSelectedThreadId('');
      setMessages([]);
    }
  }, [ensureThread, loadMessages]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/signin');
        return;
      }

      const viewerId = userData.user.id;
      setCurrentUserId(viewerId);

      const preferredUserId = searchParams.get('user') || '';
      await loadThreads(viewerId, preferredUserId);
      setIsLoading(false);
    };

    initialize();
  }, [navigate, searchParams, loadThreads]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, selectedThreadId]);

  const selectThread = async (threadId) => {
    setSelectedThreadId(threadId);
    await loadMessages(threadId);
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !selectedThreadId || !currentUserId) {
      return;
    }

    setIsSending(true);
    setError('');

    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({
        thread_id: selectedThreadId,
        sender_id: currentUserId,
        content
      });

    if (sendError) {
      setError(sendError.message || 'Unable to send message.');
      setIsSending(false);
      return;
    }

    setDraft('');
    await loadMessages(selectedThreadId);
    await loadThreads(currentUserId, selectedUserId);
    setIsSending(false);
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-48 rounded-2xl border border-border bg-primary/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-[linear-gradient(135deg,#ffffff_0%,#f7f5fd_45%,#f3ecff_100%)] px-5 py-4 md:px-6 md:py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary/75 uppercase">Messages</p>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground mt-0.5">Conversations</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={14} />
            {threads.length} active chat{threads.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <aside className="rounded-2xl border border-border bg-background/95 p-4 h-fit lg:sticky lg:top-24 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Conversations</h2>

          <label className="relative block mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Search by name or city"
              className="w-full rounded-xl border border-border bg-muted/70 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/45 outline-none focus:ring-2 focus:ring-primary/35"
            />
          </label>

          {threads.length === 0 ? (
            <p className="text-sm text-foreground/65">No conversations yet. Open a profile and click Message.</p>
          ) : filteredThreads.length === 0 ? (
            <p className="text-sm text-foreground/65">No matching conversations.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {filteredThreads.map((thread) => {
                const partnerId = thread.user_a === currentUserId ? thread.user_b : thread.user_a;
                const partner = profilesMap[partnerId];
                const isActive = thread.id === selectedThreadId;
                const partnerName = partner?.username || 'User';

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
                      isActive
                        ? 'border-primary/45 bg-primary/8 shadow-sm'
                        : 'border-border bg-background hover:bg-foreground/[0.02] hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {partner?.avatar_url ? (
                        <img
                          src={partner.avatar_url}
                          alt={partnerName}
                          className="h-10 w-10 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl border border-border bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                          {getInitial(partnerName)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-sm">{partnerName}</p>
                        <p className="text-xs text-foreground/60 truncate mt-0.5">{partner?.city || 'SkillVerse user'}</p>
                        <p className="text-[11px] text-foreground/45 mt-1">{formatDateTime(thread.updated_at)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-border bg-background p-4 md:p-6 shadow-sm">
          {selectedThread ? (
            <>
              <div className="border-b border-border pb-4 mb-4 flex items-center gap-3">
                {selectedUserProfile?.avatar_url ? (
                  <img
                    src={selectedUserProfile.avatar_url}
                    alt={selectedUserProfile?.username || 'Conversation'}
                    className="h-11 w-11 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl border border-border bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                    {getInitial(selectedUserProfile?.username || 'C')}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold leading-tight">{selectedUserProfile?.username || 'Conversation'}</h3>
                  <p className="text-sm text-foreground/60">{selectedUserProfile?.city || 'SkillVerse user'}</p>
                </div>
              </div>

              <div className="space-y-3 h-[48vh] overflow-auto pr-1 rounded-xl bg-[linear-gradient(180deg,rgba(124,58,237,0.04)_0%,rgba(255,255,255,0.6)_100%)] p-3">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-5">
                    <div className="h-11 w-11 rounded-full bg-primary/12 text-primary flex items-center justify-center mb-3">
                      <UserRound size={18} />
                    </div>
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="text-xs text-foreground/60 mt-1">Start the conversation with a quick intro.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-[0_1px_3px_rgba(15,10,26,0.08)] ${
                            isMine
                              ? 'bg-[linear-gradient(135deg,#7c3aed_0%,#8b5cf6_100%)] text-primary-foreground rounded-br-md'
                              : 'bg-white text-foreground border border-border rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.content}</p>
                          <p className={`mt-1 text-[11px] ${isMine ? 'text-primary-foreground/80' : 'text-foreground/50'}`}>
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesBottomRef} />
              </div>

              <div className="mt-4 flex items-end gap-2 rounded-xl border border-border bg-muted/40 p-2">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 rounded-xl border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={isSending || !draft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70 shadow-sm"
                >
                  <Send size={16} /> {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="min-h-[52vh] flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-primary/12 text-primary flex items-center justify-center">
                  <UserRound size={20} />
                </div>
                <p className="text-sm font-medium text-foreground">Select a conversation</p>
                <p className="text-xs text-foreground/60 mt-1">Choose someone from the left to open your chat.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
