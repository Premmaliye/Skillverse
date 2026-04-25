-- Run this script in Supabase SQL Editor.

-- 1) Profiles table for user metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  gender text,
  age int check (age between 13 and 100),
  city text,
  about text,
  experience text,
  top_skills text[] not null default '{}',
  avatar_url text,
  is_monetized boolean not null default false,
  monetization_rate numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure new columns are added for already-existing tables.
alter table public.profiles
  add column if not exists is_monetized boolean not null default false,
  add column if not exists monetization_rate numeric(10,2);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- 2) Storage bucket for profile images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Public can view profile images" on storage.objects;
create policy "Public can view profile images"
on storage.objects
for select
using (bucket_id = 'profile-images');

drop policy if exists "Users can upload own profile images" on storage.objects;
create policy "Users can upload own profile images"
on storage.objects
for insert
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own profile images" on storage.objects;
create policy "Users can update own profile images"
on storage.objects
for update
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own profile images" on storage.objects;
create policy "Users can delete own profile images"
on storage.objects
for delete
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Social posts table
create table if not exists public.skill_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_username text not null,
  author_avatar_url text,
  content text,
  media_url text,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_posts_content_or_media_required check (
    coalesce(length(trim(content)), 0) > 0 or media_url is not null
  )
);

create or replace function public.set_skill_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_skill_posts_updated_at on public.skill_posts;
create trigger trg_skill_posts_updated_at
before update on public.skill_posts
for each row
execute function public.set_skill_posts_updated_at();

alter table public.skill_posts enable row level security;

drop policy if exists "Authenticated users can read all posts" on public.skill_posts;
create policy "Authenticated users can read all posts"
on public.skill_posts
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create own posts" on public.skill_posts;
create policy "Users can create own posts"
on public.skill_posts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own posts" on public.skill_posts;
create policy "Users can update own posts"
on public.skill_posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.skill_posts;
create policy "Users can delete own posts"
on public.skill_posts
for delete
using (auth.uid() = user_id);

-- 4) Follow relationships
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_follows_unique_pair unique (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

alter table public.user_follows enable row level security;

drop policy if exists "Users can read own follows" on public.user_follows;
create policy "Users can read own follows"
on public.user_follows
for select
using (auth.uid() = follower_id);

drop policy if exists "Users can create own follows" on public.user_follows;
create policy "Users can create own follows"
on public.user_follows
for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can delete own follows" on public.user_follows;
create policy "Users can delete own follows"
on public.user_follows
for delete
using (auth.uid() = follower_id);

-- 5) Storage bucket for post media (images/videos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Public can view post media" on storage.objects;
create policy "Public can view post media"
on storage.objects
for select
using (bucket_id = 'post-media');

drop policy if exists "Users can upload own post media" on storage.objects;
create policy "Users can upload own post media"
on storage.objects
for insert
with check (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own post media" on storage.objects;
create policy "Users can update own post media"
on storage.objects
for update
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
on storage.objects
for delete
using (
  bucket_id = 'post-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 6) Post likes
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.skill_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_unique_pair unique (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "Authenticated users can read post likes" on public.post_likes;
create policy "Authenticated users can read post likes"
on public.post_likes
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create own post likes" on public.post_likes;
create policy "Users can create own post likes"
on public.post_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own post likes" on public.post_likes;
create policy "Users can delete own post likes"
on public.post_likes
for delete
using (auth.uid() = user_id);

-- 7) Post comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.skill_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_username text not null,
  author_avatar_url text,
  content text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_content_required check (length(trim(content)) > 0)
);

alter table public.post_comments enable row level security;

drop policy if exists "Authenticated users can read post comments" on public.post_comments;
create policy "Authenticated users can read post comments"
on public.post_comments
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create own post comments" on public.post_comments;
create policy "Users can create own post comments"
on public.post_comments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own post comments" on public.post_comments;
create policy "Users can delete own post comments"
on public.post_comments
for delete
using (auth.uid() = user_id);

-- 8) Profile hire terms
create table if not exists public.profile_hire_terms (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  terms_text text not null default 'No custom terms added yet.',
  terms_version int not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function public.set_profile_hire_terms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_hire_terms_updated_at on public.profile_hire_terms;
create trigger trg_profile_hire_terms_updated_at
before update on public.profile_hire_terms
for each row
execute function public.set_profile_hire_terms_updated_at();

alter table public.profile_hire_terms enable row level security;

drop policy if exists "Authenticated users can read hire terms" on public.profile_hire_terms;
create policy "Authenticated users can read hire terms"
on public.profile_hire_terms
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can update own hire terms" on public.profile_hire_terms;
create policy "Users can update own hire terms"
on public.profile_hire_terms
for insert
with check (auth.uid() = profile_id);

drop policy if exists "Users can upsert own hire terms" on public.profile_hire_terms;
create policy "Users can upsert own hire terms"
on public.profile_hire_terms
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- 9) Profile ratings and reviews
create table if not exists public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_reviews_unique_pair unique (profile_id, reviewer_id),
  constraint profile_reviews_no_self_review check (profile_id <> reviewer_id),
  constraint profile_reviews_text_required check (length(trim(review_text)) > 0)
);

create or replace function public.set_profile_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_reviews_updated_at on public.profile_reviews;
create trigger trg_profile_reviews_updated_at
before update on public.profile_reviews
for each row
execute function public.set_profile_reviews_updated_at();

alter table public.profile_reviews enable row level security;

drop policy if exists "Authenticated users can read profile reviews" on public.profile_reviews;
create policy "Authenticated users can read profile reviews"
on public.profile_reviews
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create own profile reviews" on public.profile_reviews;
create policy "Users can create own profile reviews"
on public.profile_reviews
for insert
with check (auth.uid() = reviewer_id);

drop policy if exists "Users can update own profile reviews" on public.profile_reviews;
create policy "Users can update own profile reviews"
on public.profile_reviews
for update
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

drop policy if exists "Users can delete own profile reviews" on public.profile_reviews;
create policy "Users can delete own profile reviews"
on public.profile_reviews
for delete
using (auth.uid() = reviewer_id);

-- 9b) Profile products for creator selling
create table if not exists public.profile_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  price numeric(10,2) not null check (price > 0),
  product_url text,
  image_url text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_products_title_required check (length(trim(title)) > 0),
  constraint profile_products_category_required check (length(trim(category)) > 0),
  constraint profile_products_description_required check (length(trim(description)) > 0)
);

alter table public.profile_products
  add column if not exists image_url text,
  add column if not exists image_path text;

create or replace function public.set_profile_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_products_updated_at on public.profile_products;
create trigger trg_profile_products_updated_at
before update on public.profile_products
for each row
execute function public.set_profile_products_updated_at();

alter table public.profile_products enable row level security;

drop policy if exists "Authenticated users can read profile products" on public.profile_products;
create policy "Authenticated users can read profile products"
on public.profile_products
for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can create own profile products" on public.profile_products;
create policy "Users can create own profile products"
on public.profile_products
for insert
with check (auth.uid() = seller_id);

drop policy if exists "Users can update own profile products" on public.profile_products;
create policy "Users can update own profile products"
on public.profile_products
for update
using (auth.uid() = seller_id)
with check (auth.uid() = seller_id);

drop policy if exists "Users can delete own profile products" on public.profile_products;
create policy "Users can delete own profile products"
on public.profile_products
for delete
using (auth.uid() = seller_id);

-- 9c) Storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
using (bucket_id = 'product-images');

drop policy if exists "Users can upload own product images" on storage.objects;
create policy "Users can upload own product images"
on storage.objects
for insert
with check (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own product images" on storage.objects;
create policy "Users can update own product images"
on storage.objects
for update
using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own product images" on storage.objects;
create policy "Users can delete own product images"
on storage.objects
for delete
using (
  bucket_id = 'product-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 9d) Product orders (checkout details)
create table if not exists public.product_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.profile_products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  product_title_snapshot text not null,
  price_snapshot numeric(10,2) not null,
  currency text not null default 'INR',
  customer_name text not null,
  customer_email text not null,
  customer_mobile text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_orders_no_self_buy check (buyer_id <> seller_id),
  constraint product_orders_price_positive check (price_snapshot > 0)
);

create or replace function public.set_product_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_orders_updated_at on public.product_orders;
create trigger trg_product_orders_updated_at
before update on public.product_orders
for each row
execute function public.set_product_orders_updated_at();

alter table public.product_orders enable row level security;

drop policy if exists "Participants can read product orders" on public.product_orders;
create policy "Participants can read product orders"
on public.product_orders
for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create own product orders" on public.product_orders;
create policy "Buyers can create own product orders"
on public.product_orders
for insert
with check (auth.uid() = buyer_id);

drop policy if exists "Participants can update product orders" on public.product_orders;
create policy "Participants can update product orders"
on public.product_orders
for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 9e) Product payments
create table if not exists public.product_payments (
  id uuid primary key default gen_random_uuid(),
  product_order_id uuid not null references public.product_orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  status text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_payments_unique_order unique (razorpay_order_id),
  constraint product_payments_positive_amount check (amount > 0)
);

create or replace function public.set_product_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_payments_updated_at on public.product_payments;
create trigger trg_product_payments_updated_at
before update on public.product_payments
for each row
execute function public.set_product_payments_updated_at();

alter table public.product_payments enable row level security;

drop policy if exists "Participants can read product payments" on public.product_payments;
create policy "Participants can read product payments"
on public.product_payments
for select
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create own product payments" on public.product_payments;
create policy "Buyers can create own product payments"
on public.product_payments
for insert
with check (auth.uid() = buyer_id);

drop policy if exists "Participants can update product payments" on public.product_payments;
create policy "Participants can update product payments"
on public.product_payments
for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 9) Hire requests
create table if not exists public.hire_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  profile_holder_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  requester_city text not null,
  purpose text not null,
  reason text not null,
  terms_accepted boolean not null default false,
  terms_text_snapshot text,
  terms_version int,
  proposed_price numeric(10,2),
  status text not null default 'pending' check (status in ('pending', 'price_set', 'accepted', 'paid', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hire_requests_no_self check (requester_id <> profile_holder_id)
);

create or replace function public.set_hire_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hire_requests_updated_at on public.hire_requests;
create trigger trg_hire_requests_updated_at
before update on public.hire_requests
for each row
execute function public.set_hire_requests_updated_at();

alter table public.hire_requests enable row level security;

drop policy if exists "Participants can read hire requests" on public.hire_requests;
create policy "Participants can read hire requests"
on public.hire_requests
for select
using (auth.uid() = requester_id or auth.uid() = profile_holder_id);

drop policy if exists "Users can create own hire requests" on public.hire_requests;
create policy "Users can create own hire requests"
on public.hire_requests
for insert
with check (auth.uid() = requester_id);

drop policy if exists "Participants can update hire requests" on public.hire_requests;
create policy "Participants can update hire requests"
on public.hire_requests
for update
using (auth.uid() = requester_id or auth.uid() = profile_holder_id)
with check (auth.uid() = requester_id or auth.uid() = profile_holder_id);

-- 10) Hire payments
create table if not exists public.hire_payments (
  id uuid primary key default gen_random_uuid(),
  hire_request_id uuid not null references public.hire_requests(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  profile_holder_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  status text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hire_payments_unique_order unique (razorpay_order_id)
);

-- 12) Direct message threads (one thread per user pair)
create table if not exists public.direct_message_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_message_threads_no_self check (user_a <> user_b),
  constraint direct_message_threads_unique_pair unique (user_a, user_b)
);

create or replace function public.set_direct_message_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_direct_message_threads_updated_at on public.direct_message_threads;
create trigger trg_direct_message_threads_updated_at
before update on public.direct_message_threads
for each row
execute function public.set_direct_message_threads_updated_at();

alter table public.direct_message_threads enable row level security;

drop policy if exists "Participants can read direct message threads" on public.direct_message_threads;
create policy "Participants can read direct message threads"
on public.direct_message_threads
for select
using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Users can create own direct message threads" on public.direct_message_threads;
create policy "Users can create own direct message threads"
on public.direct_message_threads
for insert
with check (auth.uid() = user_a or auth.uid() = user_b);

-- 13) Direct messages
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint direct_messages_content_required check (length(trim(content)) > 0)
);

create or replace function public.touch_direct_message_thread()
returns trigger
language plpgsql
as $$
begin
  update public.direct_message_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_direct_message_thread on public.direct_messages;
create trigger trg_touch_direct_message_thread
after insert on public.direct_messages
for each row
execute function public.touch_direct_message_thread();

alter table public.direct_messages enable row level security;

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages"
on public.direct_messages
for select
using (
  exists (
    select 1
    from public.direct_message_threads t
    where t.id = direct_messages.thread_id
      and (t.user_a = auth.uid() or t.user_b = auth.uid())
  )
);

drop policy if exists "Participants can send direct messages" on public.direct_messages;
create policy "Participants can send direct messages"
on public.direct_messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.direct_message_threads t
    where t.id = direct_messages.thread_id
      and (t.user_a = auth.uid() or t.user_b = auth.uid())
  )
);

create or replace function public.set_hire_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hire_payments_updated_at on public.hire_payments;
create trigger trg_hire_payments_updated_at
before update on public.hire_payments
for each row
execute function public.set_hire_payments_updated_at();

alter table public.hire_payments enable row level security;

drop policy if exists "Participants can read hire payments" on public.hire_payments;
create policy "Participants can read hire payments"
on public.hire_payments
for select
using (auth.uid() = requester_id or auth.uid() = profile_holder_id);

drop policy if exists "Requester can create hire payments" on public.hire_payments;
create policy "Requester can create hire payments"
on public.hire_payments
for insert
with check (auth.uid() = requester_id);

drop policy if exists "Participants can update hire payments" on public.hire_payments;
create policy "Participants can update hire payments"
on public.hire_payments
for update
using (auth.uid() = requester_id or auth.uid() = profile_holder_id)
with check (auth.uid() = requester_id or auth.uid() = profile_holder_id);

-- 11) Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 12) Monetization payments
create table if not exists public.monetization_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  status text not null default 'created' check (status in ('created', 'captured', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monetization_payments_unique_order unique (razorpay_order_id)
);

create or replace function public.set_monetization_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_monetization_payments_updated_at on public.monetization_payments;
create trigger trg_monetization_payments_updated_at
before update on public.monetization_payments
for each row
execute function public.set_monetization_payments_updated_at();

alter table public.monetization_payments enable row level security;

drop policy if exists "Users can read own monetization payments" on public.monetization_payments;
create policy "Users can read own monetization payments"
on public.monetization_payments
for select
using (auth.uid() = profile_id);

drop policy if exists "Users can create own monetization payments" on public.monetization_payments;
create policy "Users can create own monetization payments"
on public.monetization_payments
for insert
with check (auth.uid() = profile_id);

drop policy if exists "Users can update own monetization payments" on public.monetization_payments;
create policy "Users can update own monetization payments"
on public.monetization_payments
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);
