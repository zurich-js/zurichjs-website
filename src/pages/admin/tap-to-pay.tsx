import { 
  ArrowLeft, 
  Search, 
  Tag, 
  CheckCircle,
  XCircle,
  Loader,
  QrCode,
  Link as LinkIcon,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  prices: StripePrice[];
  metadata?: Record<string, string>;
}

interface StripePrice {
  id: string;
  amount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  interval?: string;
  interval_count?: number;
  nickname?: string;
}

interface StripeCoupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  valid: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
}

interface PaymentLink {
  id: string;
  url: string;
  qr_code?: string;
}

interface CartItem {
  product: StripeProduct;
  price: StripePrice;
  quantity: number;
}

export default function TapToPayAdmin() {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [coupons, setCoupons] = useState<StripeCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<StripeCoupon | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all products and coupons in parallel
        const [productsRes, couponsRes] = await Promise.all([
          fetch('/api/admin/stripe-products'),
          fetch('/api/admin/stripe-coupons')
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }

        if (couponsRes.ok) {
          const couponsData = await couponsRes.json();
          // Handle both direct array and object with coupons property
          const couponsArray = Array.isArray(couponsData) ? couponsData : couponsData.coupons || [];
          setCoupons(couponsArray.filter((coupon: StripeCoupon) => coupon.valid));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setErrorMessage('Failed to load products and coupons');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cart management functions
  const addToCart = (product: StripeProduct, price: StripePrice) => {
    const existingItem = cart.find(item => 
      item.product.id === product.id && item.price.id === price.id
    );
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id && item.price.id === price.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, price, quantity: 1 }]);
    }
  };

  const updateCartItemQuantity = (productId: string, priceId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, priceId);
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId && item.price.id === priceId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string, priceId: string) => {
    setCart(cart.filter(item => 
      !(item.product.id === productId && item.price.id === priceId)
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price.amount * item.quantity), 0);
  };

  const calculateTotal = () => {
    let total = calculateSubtotal();
    
    if (selectedCoupon && total > 0) {
      if (selectedCoupon.percent_off) {
        total = total * (1 - selectedCoupon.percent_off / 100);
      } else if (selectedCoupon.amount_off) {
        total = Math.max(0, total - selectedCoupon.amount_off);
      }
    }
    
    return total;
  };

  const handleCreatePaymentLink = async () => {
    if (cart.length === 0) {
      setErrorMessage('Please add at least one product to cart');
      return;
    }

    try {
      setPaymentLoading(true);
      setErrorMessage(null);

      const response = await fetch('/api/admin/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cart.map(item => ({
            priceId: item.price.id,
            quantity: item.quantity,
            productId: item.product.id,
          })),
          couponCode: selectedCoupon?.id,
          amount: calculateTotal(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment link');
      }

      const data = await response.json();
      setPaymentLink(data.paymentLink);
      setPaymentStatus('success');
    } catch (err) {
      console.error('Error creating payment link:', err);
      setErrorMessage('Failed to create payment link');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setSelectedCoupon(null);
    setPaymentLink(null);
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-20">
          <div className="flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading products and coupons...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile-first header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl font-bold">Quick Pay</h1>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-24">
          {/* Floating Cart Summary */}
          {cart.length > 0 && !paymentLink && (
            <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-3 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
                  <div className="text-blue-100 text-sm">
                    {formatCurrency(calculateTotal(), cart[0]?.price.currency || 'usd')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-white/20 text-white px-3 py-2 rounded text-sm font-medium hover:bg-white/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleCreatePaymentLink}
                    disabled={paymentLoading}
                    className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 text-sm flex items-center gap-1"
                  >
                    {paymentLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        Pay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Cart Access */}
          {cart.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</span>
                  <span className="ml-2">
                    {formatCurrency(calculateTotal(), cart[0]?.price.currency || 'usd')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
                >
                  Go to Cart
                </button>
              </div>
            </div>
          )}

          {/* Product Search */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 gap-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                )}
                
                {/* Price options */}
                <div className="space-y-2">
                  {product.prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium text-lg">
                          {formatCurrency(price.amount, price.currency)}
                        </span>
                        {price.type === 'recurring' && (
                          <span className="text-sm text-gray-500 ml-1">/{price.interval}</span>
                        )}
                        {price.nickname && (
                          <div className="text-sm text-gray-500">{price.nickname}</div>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product, price)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div id="cart-section" className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-lg font-semibold mb-4">Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</h2>
              
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.price.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price.amount, item.price.currency)}
                        {item.price.type === 'recurring' && ` /${item.price.interval}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.price.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateCartItemQuantity(item.product.id, item.price.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.price.id)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Apply Coupon (Optional)
                </label>
                <select
                  value={selectedCoupon?.id || ''}
                  onChange={(e) => {
                    const coupon = coupons.find(c => c.id === e.target.value);
                    setSelectedCoupon(coupon || null);
                  }}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No coupon</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.name || coupon.id} - 
                      {coupon.percent_off 
                        ? ` ${coupon.percent_off}% off`
                        : ` ${formatCurrency(coupon.amount_off!, coupon.currency!)} off`
                      }
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <h3 className="font-medium mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {cart.map((item) => (
                    <div key={`${item.product.id}-${item.price.id}`} className="flex justify-between">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.price.amount * item.quantity, item.price.currency)}</span>
                    </div>
                  ))}
                  
                  <div className="flex justify-between pt-2 border-t">
                    <span>Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal(), cart[0]?.price.currency || 'usd')}</span>
                  </div>
                  
                  {selectedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({selectedCoupon.name || selectedCoupon.id})</span>
                      <span>
                        -{selectedCoupon.percent_off 
                          ? `${selectedCoupon.percent_off}%`
                          : formatCurrency(selectedCoupon.amount_off!, selectedCoupon.currency!)
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal(), cart[0]?.price.currency || 'usd')}</span>
                  </div>
                </div>
              </div>

              {/* Create Payment Link Button */}
              {!paymentLink && (
                <button
                  onClick={handleCreatePaymentLink}
                  disabled={paymentLoading}
                  className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg text-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      Create Payment Link + QR
                    </>
                  )}
                </button>
              )}

              {/* Clear Cart */}
              <button
                onClick={clearCart}
                className="w-full mt-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300"
              >
                Clear Cart
              </button>
            </div>
          )}

          {/* Payment Link Display */}
          {paymentLink && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Link Ready!</h3>
                
                {/* QR Code - Prominent display */}
                {paymentLink.qr_code && (
                  <div className="mb-4">
                    <Image 
                      src={paymentLink.qr_code} 
                      alt="Payment QR Code" 
                      width={192}
                      height={192}
                      className="mx-auto border-2 border-gray-200 rounded-lg"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Customer can scan this QR code to pay
                    </p>
                  </div>
                )}
                
                {/* Payment Link */}
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 border rounded-lg text-sm break-all">
                    {paymentLink.url}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(paymentLink.url)}
                      className="bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={() => window.open(paymentLink.url, '_blank')}
                      className="bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Open
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetForm}
                  className="w-full mt-4 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700"
                >
                  Create New Payment
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {paymentStatus === 'error' && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Failed</h3>
                {errorMessage && (
                  <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
                )}
                <button
                  onClick={() => {
                    setPaymentStatus('idle');
                    setPaymentLink(null);
                    setErrorMessage(null);
                  }}
                  className="bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errorMessage && paymentStatus === 'idle' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}