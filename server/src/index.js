import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

dotenv.config({ path: path.resolve(currentDirectory, '../.env') });
dotenv.config({ path: path.resolve(currentDirectory, '../../.env.local') });

const {
  PORT = 4000,
  CLIENT_ORIGIN = 'http://localhost:5173',
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET
} = process.env;

const allowedOrigins = [
  ...new Set(
    String(CLIENT_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .concat(['http://localhost:5173', 'http://localhost:5174'])
  )
];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase server environment variables.');
}

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay keys in server environment variables.');
}

const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json({ limit: '1mb' }));

const requestStatuses = {
  pending: 'pending',
  priceSet: 'price_set',
  accepted: 'accepted',
  paid: 'paid',
  confirmed: 'confirmed',
  rejected: 'rejected'
};

const monetizationAmountInr = 200;

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function shortReceipt(prefix, entityId) {
  const cleanPrefix = String(prefix || 'rcpt').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'rcpt';
  const cleanEntity = String(entityId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'id';
  const stamp = Date.now().toString(36).slice(-8);
  return `${cleanPrefix}_${cleanEntity}_${stamp}`.slice(0, 40);
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await authSupabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function validatePositiveAmount(amount) {
  const numeric = Number(amount);
  return !Number.isNaN(numeric) && numeric > 0;
}

async function createNotification({ userId, type, title, message, metadata = {} }) {
  await adminSupabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    metadata
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hiring/terms/:profileId', requireAuth, asyncHandler(async (req, res) => {
  const { profileId } = req.params;

  const { data, error } = await adminSupabase
    .from('profile_hire_terms')
    .select('profile_id, terms_text, terms_version, updated_at')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({
    data: data || {
      profile_id: profileId,
      terms_text: 'No custom terms added yet.',
      terms_version: 1
    }
  });
}));

app.put('/api/hiring/terms', requireAuth, asyncHandler(async (req, res) => {
  const { termsText } = req.body;

  if (!termsText || !String(termsText).trim()) {
    return res.status(400).json({ error: 'Terms text is required.' });
  }

  const { data: currentTerms } = await adminSupabase
    .from('profile_hire_terms')
    .select('terms_version')
    .eq('profile_id', req.user.id)
    .maybeSingle();

  const nextVersion = currentTerms?.terms_version ? Number(currentTerms.terms_version) + 1 : 1;

  const { error } = await adminSupabase
    .from('profile_hire_terms')
    .upsert(
      {
        profile_id: req.user.id,
        terms_text: String(termsText).trim(),
        terms_version: nextVersion
      },
      { onConflict: 'profile_id' }
    );

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true, termsVersion: nextVersion });
}));

app.post('/api/hiring/requests', requireAuth, asyncHandler(async (req, res) => {
  const { profileId, name, city, purpose, reason, acceptedTerms, termsVersion } = req.body;

  if (!profileId || profileId === req.user.id) {
    return res.status(400).json({ error: 'Invalid profile.' });
  }

  if (!acceptedTerms) {
    return res.status(400).json({ error: 'Terms must be accepted to continue.' });
  }

  if (![name, city, purpose, reason].every((field) => String(field || '').trim())) {
    return res.status(400).json({ error: 'All hiring form fields are required.' });
  }

  const { data: termsData, error: termsError } = await adminSupabase
    .from('profile_hire_terms')
    .select('terms_text, terms_version')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (termsError) {
    return res.status(400).json({ error: termsError.message });
  }

  const { data, error } = await adminSupabase
    .from('hire_requests')
    .insert({
      requester_id: req.user.id,
      profile_holder_id: profileId,
      requester_name: String(name).trim(),
      requester_city: String(city).trim(),
      purpose: String(purpose).trim(),
      reason: String(reason).trim(),
      terms_accepted: true,
      terms_text_snapshot: termsData?.terms_text || 'No custom terms added yet.',
      terms_version: Number(termsVersion || termsData?.terms_version || 1),
      status: requestStatuses.pending
    })
    .select('id, requester_id, profile_holder_id, status, created_at')
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await createNotification({
    userId: profileId,
    type: 'hire_request',
    title: 'New hire request',
    message: 'You have received a new hire request.',
    metadata: { hireRequestId: data.id }
  });

  return res.status(201).json({ data });
}));

app.get('/api/hiring/requests/incoming', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('profile_holder_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data: data || [] });
}));

app.get('/api/hiring/requests/outgoing', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('requester_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data: data || [] });
}));

app.patch('/api/hiring/requests/:id/set-price', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;

  if (!validatePositiveAmount(price)) {
    return res.status(400).json({ error: 'Valid positive price is required.' });
  }

  const { data: requestData, error: fetchError } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !requestData) {
    return res.status(404).json({ error: 'Hire request not found.' });
  }

  if (requestData.profile_holder_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  if (![requestStatuses.pending, requestStatuses.priceSet].includes(requestData.status)) {
    return res.status(400).json({ error: 'Price can only be set for pending requests.' });
  }

  const { data, error } = await adminSupabase
    .from('hire_requests')
    .update({
      proposed_price: Number(price),
      status: requestStatuses.priceSet
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await createNotification({
    userId: requestData.requester_id,
    type: 'price_set',
    title: 'Service price received',
    message: `A price was proposed for your hire request: INR ${Number(price).toFixed(2)}.`,
    metadata: { hireRequestId: id }
  });

  return res.json({ data });
}));

app.patch('/api/hiring/requests/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { by } = req.body;

  const { data: requestData, error: fetchError } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !requestData) {
    return res.status(404).json({ error: 'Hire request not found.' });
  }

  if (by === 'holder' && requestData.profile_holder_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  if (by === 'requester' && requestData.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  const { data, error } = await adminSupabase
    .from('hire_requests')
    .update({ status: requestStatuses.rejected })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const notifyTarget = by === 'holder' ? requestData.requester_id : requestData.profile_holder_id;
  const actorLabel = by === 'holder' ? 'profile holder' : 'requester';

  await createNotification({
    userId: notifyTarget,
    type: 'hire_rejected',
    title: 'Hire request rejected',
    message: `A hire request was rejected by ${actorLabel}.`,
    metadata: { hireRequestId: id }
  });

  return res.json({ data });
}));

app.patch('/api/hiring/requests/:id/respond-price', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const { data: requestData, error: fetchError } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !requestData) {
    return res.status(404).json({ error: 'Hire request not found.' });
  }

  if (requestData.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  if (requestData.status !== requestStatuses.priceSet) {
    return res.status(400).json({ error: 'Price can only be responded when status is price_set.' });
  }

  const nextStatus = action === 'accept' ? requestStatuses.accepted : requestStatuses.rejected;

  const { data, error } = await adminSupabase
    .from('hire_requests')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await createNotification({
    userId: requestData.profile_holder_id,
    type: action === 'accept' ? 'price_accepted' : 'price_rejected',
    title: action === 'accept' ? 'Price accepted' : 'Price rejected',
    message: action === 'accept' ? 'The requester accepted your proposed price.' : 'The requester rejected your proposed price.',
    metadata: { hireRequestId: id }
  });

  return res.json({ data });
}));

app.post('/api/hiring/requests/:id/create-order', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: requestData, error: fetchError } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !requestData) {
    return res.status(404).json({ error: 'Hire request not found.' });
  }

  if (requestData.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  if (requestData.status !== requestStatuses.accepted) {
    return res.status(400).json({ error: 'Payment can only start after price acceptance.' });
  }

  const amount = Number(requestData.proposed_price || 0);
  if (!validatePositiveAmount(amount)) {
    return res.status(400).json({ error: 'Invalid amount for order creation.' });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: shortReceipt('hire', id),
    notes: {
      hireRequestId: id,
      requesterId: requestData.requester_id,
      profileHolderId: requestData.profile_holder_id
    }
  });

  const { error: paymentError } = await adminSupabase
    .from('hire_payments')
    .insert({
      hire_request_id: id,
      requester_id: requestData.requester_id,
      profile_holder_id: requestData.profile_holder_id,
      amount,
      currency: 'INR',
      razorpay_order_id: order.id,
      status: 'created'
    });

  if (paymentError) {
    return res.status(400).json({ error: paymentError.message });
  }

  return res.json({
    data: {
      order,
      razorpayKeyId: RAZORPAY_KEY_ID
    }
  });
}));

app.post('/api/hiring/requests/:id/verify-payment', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification data.' });
  }

  const { data: requestData, error: requestError } = await adminSupabase
    .from('hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (requestError || !requestData) {
    return res.status(404).json({ error: 'Hire request not found.' });
  }

  if (requestData.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  const digest = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (digest !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid Razorpay signature.' });
  }

  await adminSupabase
    .from('hire_payments')
    .update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'captured'
    })
    .eq('hire_request_id', id)
    .eq('razorpay_order_id', razorpay_order_id);

  await adminSupabase
    .from('hire_requests')
    .update({ status: requestStatuses.paid })
    .eq('id', id);

  await adminSupabase
    .from('hire_requests')
    .update({ status: requestStatuses.confirmed })
    .eq('id', id);

  await createNotification({
    userId: requestData.requester_id,
    type: 'payment_success',
    title: 'Payment successful',
    message: 'Your payment was verified and the hire request is confirmed.',
    metadata: { hireRequestId: id, razorpayPaymentId: razorpay_payment_id }
  });

  await createNotification({
    userId: requestData.profile_holder_id,
    type: 'hire_confirmed',
    title: 'Hire confirmed',
    message: 'Payment completed. Your hire request is now confirmed.',
    metadata: { hireRequestId: id, razorpayPaymentId: razorpay_payment_id }
  });

  return res.json({ success: true });
}));

app.get('/api/notifications', requireAuth, asyncHandler(async (req, res) => {
  const { data, error } = await adminSupabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ data: data || [] });
}));

app.patch('/api/notifications/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await adminSupabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
}));

app.post('/api/monetization/create-order', requireAuth, asyncHandler(async (req, res) => {
  const { data: profileData, error: profileError } = await adminSupabase
    .from('profiles')
    .select('id, is_monetized')
    .eq('id', req.user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  if (profileData.is_monetized) {
    return res.status(400).json({ error: 'Account is already monetized.' });
  }

  const order = await razorpay.orders.create({
    amount: monetizationAmountInr * 100,
    currency: 'INR',
    receipt: shortReceipt('monetize', req.user.id),
    notes: {
      profileId: req.user.id,
      type: 'monetization'
    }
  });

  const { error: paymentInsertError } = await adminSupabase
    .from('monetization_payments')
    .insert({
      profile_id: req.user.id,
      amount: monetizationAmountInr,
      currency: 'INR',
      razorpay_order_id: order.id,
      status: 'created'
    });

  if (paymentInsertError) {
    return res.status(400).json({ error: paymentInsertError.message });
  }

  return res.json({
    data: {
      order,
      razorpayKeyId: RAZORPAY_KEY_ID,
      amountInr: monetizationAmountInr
    }
  });
}));

app.post('/api/monetization/verify-payment', requireAuth, asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification data.' });
  }

  const digest = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (digest !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid Razorpay signature.' });
  }

  const { data: paymentData, error: paymentFetchError } = await adminSupabase
    .from('monetization_payments')
    .select('*')
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('profile_id', req.user.id)
    .maybeSingle();

  if (paymentFetchError || !paymentData) {
    return res.status(404).json({ error: 'Payment session not found.' });
  }

  await adminSupabase
    .from('monetization_payments')
    .update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'captured'
    })
    .eq('id', paymentData.id);

  const { error: monetizeError } = await adminSupabase
    .from('profiles')
    .update({
      is_monetized: true
    })
    .eq('id', req.user.id);

  if (monetizeError) {
    return res.status(400).json({ error: monetizeError.message });
  }

  await createNotification({
    userId: req.user.id,
    type: 'monetization_success',
    title: 'Account monetized',
    message: 'Your account is now monetized after successful payment.',
    metadata: { razorpayPaymentId: razorpay_payment_id }
  });

  return res.json({ success: true, isMonetized: true });
}));

app.use((error, _req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('SkillVerse API error:', {
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
    raw: error
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error?.status || 500).json({
    error: error?.message || 'Internal server error'
  });
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception:', error);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SkillVerse API listening on port ${PORT}`);
});
