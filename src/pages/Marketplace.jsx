import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Search, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function formatAge(createdAt) {
  const ts = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isNaN(ts)) return 'recently';
  const diffMs = Math.max(0, Date.now() - ts);
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'}`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} day${diffD === 1 ? '' : 's'}`;
  const diffW = Math.floor(diffD / 7);
  return `${diffW} week${diffW === 1 ? '' : 's'}`;
}

function pseudoReplies(productId) {
  const source = String(productId || 'x');
  const score = source.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (score % 18) + 1;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [sellerMap, setSellerMap] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        navigate('/signin');
        return;
      }

      const { data: productRows, error: productError } = await supabase
        .from('profile_products')
        .select('id,seller_id,title,category,description,price,product_url,image_url,is_active,created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productError) {
        setError(productError.message || 'Unable to load marketplace products.');
        setProducts([]);
        setIsLoading(false);
        return;
      }

      const rows = Array.isArray(productRows) ? productRows : [];
      setProducts(rows);

      const sellerIds = [...new Set(rows.map((item) => item.seller_id).filter(Boolean))];
      if (sellerIds.length > 0) {
        const { data: sellers, error: sellerError } = await supabase
          .from('profiles')
          .select('id,username,city,avatar_url')
          .in('id', sellerIds);

        if (sellerError) {
          setError(sellerError.message || 'Unable to load seller info.');
        }

        const map = {};
        (sellers || []).forEach((seller) => {
          map[seller.id] = seller;
        });
        setSellerMap(map);
      } else {
        setSellerMap({});
      }

      setIsLoading(false);
    };

    load();
  }, [navigate]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter((item) => {
      const seller = sellerMap[item.seller_id];
      const haystack = `${item.title || ''} ${item.category || ''} ${item.description || ''} ${seller?.username || ''} ${seller?.city || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, search, sellerMap]);

  return (
    <div className="market-shell">
      {error && <div className="alert-error animate-fade-in" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="market-hero animate-fade-in">
        <div className="market-hero-head">
          <div>
            <p className="market-eyebrow">Community marketplace</p>
            <h1>Open listings</h1>
          </div>
          <div className="market-count-pill">
            <ShoppingBag size={14} /> {products.length} listed
          </div>
        </div>

        <div className="market-search-wrap">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings by title, category, or seller"
            className="market-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="market-grid">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton" style={{ height: 300, borderRadius: 16 }} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', padding: '30px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#374151', fontWeight: 600 }}>No products found</p>
          <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '0.86rem' }}>Try a different search or check back later.</p>
        </div>
      ) : (
        <div className="market-grid">
          {filteredProducts.map((item) => {
            const seller = sellerMap[item.seller_id];
            const sellerName = seller?.username || 'Creator';
            const age = formatAge(item.created_at);
            const isUrgent = age === 'just now' || age.startsWith('1 hour') || age.startsWith('2 hour');
            const tags = [item.category || 'General', seller?.city || 'Local', 'Housing'];
            const replies = pseudoReplies(item.id);

            return (
              <article key={item.id} className="market-card animate-fade-in">
                <Link to={`/marketplace/product/${item.id}`} className="market-card-image-link">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="market-card-image" />
                  ) : (
                    <div className="market-card-image market-card-image-fallback">
                      <ShoppingBag size={28} />
                    </div>
                  )}
                  <div className="market-card-badges">
                    {isUrgent ? <span className="market-badge-urgent">Urgent</span> : null}
                    <span className="market-badge-open">Open</span>
                  </div>
                </Link>

                <div className="market-card-body">
                  <Link to={`/marketplace/product/${item.id}`} className="market-card-title">
                    {item.title}
                  </Link>

                  <div className="market-card-tags">
                    {tags.map((tag) => (
                      <span key={`${item.id}-${tag}`} className="market-card-tag">{tag}</span>
                    ))}
                  </div>

                  <div className="market-card-meta-row">
                    <div className="market-card-replies"><MessageCircle size={13} /> {replies} Replies</div>
                    <div className="market-card-time">{age}</div>
                  </div>

                  <div className="market-card-seller">
                    by <Link to={`/profile/${item.seller_id}`}>{sellerName}</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
