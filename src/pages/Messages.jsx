import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
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

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <aside className="rounded-2xl border border-border bg-background p-4 h-fit lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold mb-3">Conversations</h2>

          {threads.length === 0 ? (
            <p className="text-sm text-foreground/65">No conversations yet. Open a profile and click Message.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {threads.map((thread) => {
                const partnerId = thread.user_a === currentUserId ? thread.user_b : thread.user_a;
                const partner = profilesMap[partnerId];
                const isActive = thread.id === selectedThreadId;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.id)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-foreground/[0.02]'
                    }`}
                  >
                    <p className="font-medium truncate">{partner?.username || 'User'}</p>
                    <p className="text-xs text-foreground/60 truncate mt-1">{partner?.city || 'SkillVerse user'}</p>
                    <p className="text-[11px] text-foreground/50 mt-1">{formatDateTime(thread.updated_at)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
          {selectedThread ? (
            <>
              <div className="border-b border-border pb-4 mb-4">
                <h3 className="text-xl font-semibold">{selectedUserProfile?.username || 'Conversation'}</h3>
                <p className="text-sm text-foreground/60">{selectedUserProfile?.city || 'SkillVerse user'}</p>
              </div>

              <div className="space-y-3 h-[48vh] overflow-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-foreground/65">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-foreground/[0.04] text-foreground'
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
              </div>

              <div className="mt-4 flex items-end gap-2">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-xl border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={isSending || !draft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  <Send size={16} /> {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground/65">Select a conversation to start messaging.</p>
          )}
        </section>
      </div>
    </div>
  );
}
