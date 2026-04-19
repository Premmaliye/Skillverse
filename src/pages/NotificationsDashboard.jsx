import { useEffect, useMemo, useState } from 'react';
import { Bell, CircleDollarSign, Clock3, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { apiGet, apiPatch, apiPost } from '../lib/apiClient';

function statusClass(status) {
  if (status === 'confirmed') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (status === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/30';
  if (status === 'price_set') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-primary/10 text-primary border-primary/30';
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function NotificationsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [priceDrafts, setPriceDrafts] = useState({});
  const [processingId, setProcessingId] = useState('');

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [incomingResponse, outgoingResponse, notificationsResponse] = await Promise.all([
        apiGet('/api/hiring/requests/incoming'),
        apiGet('/api/hiring/requests/outgoing'),
        apiGet('/api/notifications')
      ]);

      setIncoming(incomingResponse.data || []);
      setOutgoing(outgoingResponse.data || []);
      setNotifications(notificationsResponse.data || []);

      setPriceDrafts(
        (incomingResponse.data || []).reduce((acc, request) => {
          acc[request.id] = request.proposed_price ? String(request.proposed_price) : '';
          return acc;
        }, {})
      );
    } catch (loadError) {
      setError(loadError.message || 'Unable to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const setPrice = async (requestId) => {
    const draft = priceDrafts[requestId];
    setProcessingId(requestId);
    setError('');

    try {
      await apiPatch(`/api/hiring/requests/${requestId}/set-price`, { price: draft });
      await loadDashboard();
    } catch (setPriceError) {
      setError(setPriceError.message || 'Unable to set price.');
    } finally {
      setProcessingId('');
    }
  };

  const rejectRequest = async (requestId, by) => {
    setProcessingId(requestId);
    setError('');

    try {
      await apiPatch(`/api/hiring/requests/${requestId}/reject`, { by });
      await loadDashboard();
    } catch (rejectError) {
      setError(rejectError.message || 'Unable to reject request.');
    } finally {
      setProcessingId('');
    }
  };

  const respondPrice = async (requestId, action) => {
    setProcessingId(requestId);
    setError('');

    try {
      await apiPatch(`/api/hiring/requests/${requestId}/respond-price`, { action });
      await loadDashboard();
    } catch (responseError) {
      setError(responseError.message || 'Unable to update response.');
    } finally {
      setProcessingId('');
    }
  };

  const payNow = async (requestItem) => {
    setProcessingId(requestItem.id);
    setError('');

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Unable to load Razorpay checkout script.');
        setProcessingId('');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      const orderResponse = await apiPost(`/api/hiring/requests/${requestItem.id}/create-order`, {});
      const { order, razorpayKeyId } = orderResponse.data;

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SkillVerse Hiring',
        description: `Hire request ${requestItem.id}`,
        order_id: order.id,
        prefill: {
          name: user?.user_metadata?.full_name || requestItem.requester_name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#aa3bff'
        },
        handler: async (response) => {
          try {
            await apiPost(`/api/hiring/requests/${requestItem.id}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            await loadDashboard();
          } catch (verifyError) {
            setError(verifyError.message || 'Payment verification failed.');
          } finally {
            setProcessingId('');
          }
        }
      });

      rzp.open();
    } catch (payError) {
      setError(payError.message || 'Unable to start payment.');
      setProcessingId('');
    }
  };

  const markRead = async (notificationId) => {
    try {
      await apiPatch(`/api/notifications/${notificationId}/read`, {});
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
    } catch (markError) {
      setError(markError.message || 'Unable to mark notification as read.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-40 rounded-2xl border border-border bg-primary/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Hiring Dashboard</h1>
            <p className="text-sm text-foreground/70 mt-2">Track requests, set pricing, and complete payments.</p>
          </div>
          <div className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70">
            {unreadCount} unread notifications
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 space-y-6">
          <article className="rounded-2xl border border-border bg-background p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">Incoming Hire Requests</h2>
            </div>

            {incoming.length === 0 ? (
              <p className="text-sm text-foreground/65">No incoming requests yet.</p>
            ) : (
              <div className="space-y-4">
                {incoming.map((request) => (
                  <article key={request.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{request.requester_name} from {request.requester_city}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">{formatDate(request.created_at)}</p>
                    <p className="text-sm mt-3"><span className="font-medium">Purpose:</span> {request.purpose}</p>
                    <p className="text-sm mt-1"><span className="font-medium">Reason:</span> {request.reason}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {(request.status === 'pending' || request.status === 'price_set') && (
                        <>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceDrafts[request.id] || ''}
                            onChange={(event) => setPriceDrafts((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            placeholder="Set price"
                            className="rounded-lg border border-border px-3 py-2 text-sm bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => setPrice(request.id)}
                            disabled={processingId === request.id}
                            className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
                          >
                            {processingId === request.id ? 'Saving...' : 'Set Price'}
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectRequest(request.id, 'holder')}
                            disabled={processingId === request.id}
                            className="rounded-lg border border-destructive/30 text-destructive px-3 py-2 text-sm hover:bg-destructive/10 transition-colors disabled:opacity-70"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {request.status === 'confirmed' && (
                        <span className="text-sm text-emerald-700">Payment confirmed for INR {request.proposed_price}</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-background p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock3 size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">My Outgoing Requests</h2>
            </div>

            {outgoing.length === 0 ? (
              <p className="text-sm text-foreground/65">No outgoing requests yet.</p>
            ) : (
              <div className="space-y-4">
                {outgoing.map((request) => (
                  <article key={request.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Request to profile {request.profile_holder_id.slice(0, 8)}...</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">{formatDate(request.created_at)}</p>

                    {request.proposed_price && (
                      <p className="text-sm mt-3">Proposed price: <span className="font-semibold">INR {request.proposed_price}</span></p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {request.status === 'price_set' && (
                        <>
                          <button
                            type="button"
                            onClick={() => respondPrice(request.id, 'accept')}
                            disabled={processingId === request.id}
                            className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
                          >
                            Accept Price
                          </button>
                          <button
                            type="button"
                            onClick={() => respondPrice(request.id, 'reject')}
                            disabled={processingId === request.id}
                            className="rounded-lg border border-destructive/30 text-destructive px-3 py-2 text-sm hover:bg-destructive/10 transition-colors disabled:opacity-70"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {request.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => payNow(request)}
                          disabled={processingId === request.id}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 transition-colors disabled:opacity-70"
                        >
                          {processingId === request.id ? 'Opening...' : 'Pay with Razorpay'}
                        </button>
                      )}

                      {request.status === 'confirmed' && (
                        <span className="text-sm text-emerald-700">Request confirmed</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section>
          <article className="rounded-2xl border border-border bg-background p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-primary" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>

            {notifications.length === 0 ? (
              <p className="text-sm text-foreground/65">No notifications.</p>
            ) : (
              <div className="space-y-3 max-h-[760px] overflow-auto pr-1">
                {notifications.map((item) => (
                  <article key={item.id} className={`rounded-xl border p-3 ${item.is_read ? 'border-border' : 'border-primary/40 bg-primary/5'}`}>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-foreground/70 mt-1">{item.message}</p>
                    <p className="text-[11px] text-foreground/50 mt-2">{formatDate(item.created_at)}</p>
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                      >
                        <Send size={12} /> Mark as read
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
