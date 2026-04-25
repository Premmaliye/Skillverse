import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, ShoppingBag } from 'lucide-react';
import { apiGet, apiPost } from '../lib/apiClient';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ProductCheckout() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [step, setStep] = useState(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [product, setProduct] = useState(null);

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerMobile: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        navigate('/marketplace');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await apiGet(`/api/products/${productId}`);
        setProduct(response.data || null);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load product details.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [navigate, productId]);

  const formIsValid = useMemo(() => {
    const required = [
      form.customerName,
      form.customerEmail,
      form.customerMobile,
      form.addressLine1,
      form.city,
      form.state,
      form.pincode
    ];

    if (!required.every((item) => String(item || '').trim())) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.customerEmail || '').trim())) return false;
    if (!/^\d{10}$/.test(String(form.customerMobile || '').trim())) return false;
    if (!/^\d{6}$/.test(String(form.pincode || '').trim())) return false;
    return true;
  }, [form]);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formIsValid) {
        setError('Please fill valid name, email, mobile and address details before continuing.');
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const handlePayment = async () => {
    if (!product || !productId || !formIsValid) return;

    setError('');
    setIsPaying(true);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setError('Unable to load Razorpay checkout.');
        setIsPaying(false);
        return;
      }

      const createOrderResponse = await apiPost(`/api/products/${productId}/create-order`, form);
      const { order, productOrderId, razorpayKeyId } = createOrderResponse.data || {};

      if (!order?.id || !productOrderId || !razorpayKeyId) {
        throw new Error('Unable to initialize payment.');
      }

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SkillVerse',
        description: product.title || 'Product purchase',
        order_id: order.id,
        prefill: {
          name: form.customerName,
          email: form.customerEmail,
          contact: form.customerMobile
        },
        theme: { color: '#7c3aed' },
        handler: async (paymentData) => {
          try {
            await apiPost(`/api/products/${productId}/verify-payment`, {
              productOrderId,
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_signature: paymentData.razorpay_signature
            });
            setPurchaseSuccess(true);
          } catch (verifyError) {
            setError(verifyError.message || 'Payment verification failed.');
          } finally {
            setIsPaying(false);
          }
        }
      });

      razorpay.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setIsPaying(false);
      });

      razorpay.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start payment.');
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px' }}>
        <div className="skeleton" style={{ height: 220, borderRadius: 20, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
        {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 16, padding: 20 }}>
          <p style={{ margin: 0, color: '#6b7280' }}>Product not found.</p>
          <Link to="/marketplace" className="btn-soft" style={{ marginTop: 12, textDecoration: 'none' }}>Back to Market</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px', fontFamily: 'Inter,sans-serif' }}>
      {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

      <button
        type="button"
        onClick={() => navigate('/marketplace')}
        className="btn-outline"
        style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={14} /> Back to Market
      </button>

      {purchaseSuccess ? (
        <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 18, padding: '28px 22px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={28} color="#059669" />
          </div>
          <h2 style={{ margin: '0 0 6px', color: '#0f0a1a', fontSize: '1.25rem' }}>Payment Successful</h2>
          <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: '0.9rem' }}>
            Your order has been placed successfully.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/marketplace" className="btn-soft" style={{ textDecoration: 'none' }}>Continue Shopping</Link>
            <Link to={`/messages?user=${product.seller_id}`} className="btn-outline" style={{ textDecoration: 'none' }}>Message Seller</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'start' }}>
          <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 18, overflow: 'hidden' }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
            ) : (
              <div style={{ height: 220, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={36} color="#7c3aed" />
              </div>
            )}

            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>{product.category}</p>
              <h1 style={{ margin: '6px 0', color: '#0f0a1a', fontSize: '1.35rem', letterSpacing: '-0.02em' }}>{product.title}</h1>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{product.description}</p>

              {step === 2 && (
                <div style={{ marginTop: 16, borderTop: '1px solid #f0ecfa', paddingTop: 14 }}>
                  <h3 style={{ margin: '0 0 8px', color: '#0f0a1a', fontSize: '0.95rem' }}>Delivery & Contact Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} placeholder="Full name" style={inputStyle} />
                    <input value={form.customerEmail} onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))} placeholder="Email" style={inputStyle} />
                    <input value={form.customerMobile} onChange={(e) => setForm((p) => ({ ...p, customerMobile: e.target.value }))} placeholder="Mobile (10 digits)" style={inputStyle} />
                    <input value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" style={inputStyle} />
                    <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" style={inputStyle} />
                    <input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="State" style={inputStyle} />
                  </div>
                  <input value={form.addressLine1} onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="Address line 1" style={{ ...inputStyle, marginTop: 10 }} />
                  <input value={form.addressLine2} onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))} placeholder="Address line 2 (optional)" style={{ ...inputStyle, marginTop: 10 }} />
                </div>
              )}

              {step === 3 && (
                <div style={{ marginTop: 16, borderTop: '1px solid #f0ecfa', paddingTop: 14 }}>
                  <h3 style={{ margin: '0 0 8px', color: '#0f0a1a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="#7c3aed" /> Confirm Shipping Details
                  </h3>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '0.86rem', lineHeight: 1.6 }}>
                    {form.customerName} · {form.customerMobile}
                  </p>
                  <p style={{ margin: '2px 0 0', color: '#4b5563', fontSize: '0.86rem', lineHeight: 1.6 }}>
                    {form.addressLine1}{form.addressLine2 ? `, ${form.addressLine2}` : ''}, {form.city}, {form.state} - {form.pincode}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 18, padding: '16px 16px 18px', position: 'sticky', top: 86 }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checkout</p>
            <h2 style={{ margin: '4px 0 10px', fontSize: '1.05rem', color: '#0f0a1a' }}>Step {step} of 3</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{ height: 6, borderRadius: 99, background: step >= s ? '#7c3aed' : '#ece7fa' }} />
              ))}
            </div>

            <div style={{ padding: '12px 12px', borderRadius: 12, background: '#f7f5fd', border: '1px solid #ede9fe', marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>Product Price</p>
              <p style={{ margin: '3px 0 0', fontSize: '1.28rem', color: '#0f0a1a', fontWeight: 800 }}>₹{Number(product.price || 0).toFixed(0)}</p>
            </div>

            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn-primary" style={{ width: '100%', padding: '10px' }}>
                {step === 1 ? 'Buy Now' : 'Next: Payment'}
              </button>
            ) : (
              <button type="button" onClick={handlePayment} disabled={isPaying || !formIsValid} className="btn-primary" style={{ width: '100%', padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CreditCard size={15} /> {isPaying ? 'Processing...' : 'Pay Now'}
              </button>
            )}

            <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: '0.74rem', lineHeight: 1.5 }}>
              Payments are processed securely using Razorpay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #ede9fe',
  borderRadius: 10,
  background: '#fafafa',
  color: '#0f0a1a',
  fontFamily: 'Inter,sans-serif',
  fontSize: '0.86rem',
  outline: 'none',
  boxSizing: 'border-box'
};
