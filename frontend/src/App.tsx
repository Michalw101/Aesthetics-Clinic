import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, User, Sparkles, Calendar, ShoppingBag, Info, Menu, X, 
  MessageCircle, ArrowLeft, Star, Clock, MapPin, Phone, Instagram, Facebook,
  LogIn, UserPlus, LogOut, CheckCircle2, Package, Users, Trash2, Edit3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { sendChatToBackend, addSupabaseData } from './lib/api';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import UserManagement from './components/UserManagement';
import OrderManagement from './components/OrderManagement';
import { useClinicData } from './hooks/useClinicData';
import StorePage from './pages/StorePage';
import { formatDisplayDate } from './lib/format';
import { useCart } from "./hooks/useCart";

type Page = 'home' | 'consultation' | 'treatments' | 'booking' | 'store' | 'profile' | 'admin' | 'blog';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface UserData {
  name: string;
  email: string;
}

export default function App() {
  const { user, profile, loading: authLoading, logout, isAdmin, authError } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { 
    products, appointments, allScheduledAppointments, blogPosts, orders, 
    reviews, treatments,
    bookAppointment, updateAppointmentStatus, 
    placeOrder, updateOrderStatus, addBlogPost, deleteBlogPost,
    addReview, updateReviewStatus, deleteReview, addTreatment, deleteTreatment
  } = useClinicData(user?.uid);

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);
  const { cart, addToCart, removeFromCart, clearCart } = useCart(user?.uid);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'שלום! אני אסיסטנטית Aesthetics Clinic. איך אוכל לעזור לך היום בטיפוח העור או במידע על הטיפולים שלנו?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAssistantOpen) scrollToBottom();
  }, [messages, isAssistantOpen]);

  useEffect(() => {
    if (profile) {
      setMessages(prev => [...prev, { role: 'model', text: `שלום ${profile.name}! ברוכה השבה לקליניקה. איך אוכל לעזור לך היום?` }]);
    }
  }, [profile?.uid]);

  useEffect(() => {
    if (authError) {
      toast.error(authError, {
        position: 'top-center',
        duration: 4000,
      });
    }
  }, [authError]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      history.push({ role: 'user', parts: [{ text: userMessage }] });

      const response = await sendChatToBackend(history);
      if (response) {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error('Error chatting with Gemini:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'מצטערת, חלה שגיאה בחיבור. אנא נסי שוב מאוחר יותר.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("אנא התחברי כדי לבצע הזמנה", { position: "top-center" });
      setShowAuthForm(true);
      return;
    }
    if (cart.length === 0) return;

    const totalPrice = cart.reduce((sum, item) => {
      const price =
        typeof item.price === "string"
          ? parseFloat(item.price.replace("₪", ""))
          : item.price;
      const qty = item.quantity || 1; // לקיחת הכמות בחשבון
      return sum + price * qty;
    }, 0);

    try {
      await placeOrder({
        clientUid: user.uid,
        clientName: profile?.name || "User",
        items: cart,
        totalPrice,
      });

      clearCart();

      toast.success("ההזמנה בוצעה בהצלחה! תוכלי לראות אותה בפרופיל שלך", {
        position: "top-center",
      });
      navigateTo("profile");
    } catch (error) {
      toast.error("חלה שגיאה בביצוע ההזמנה. אנא נסי שוב.");
    }
  };
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-beige">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-beige text-brand-dark font-sans selection:bg-brand-gold/30" dir="rtl">
      <Toaster position="top-center" richColors />
      <AnimatePresence>
        {showAuthForm && (
          <AuthForm
            key="auth-form"
            onClose={() => setShowAuthForm(false)}
            onSuccess={() => setShowAuthForm(false)}
          />
        )}
      </AnimatePresence>
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-brand-gold/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 
              className="text-2xl serif font-semibold tracking-wide text-brand-gold cursor-pointer"
              onClick={() => navigateTo('home')}
            >
              Aesthetics
            </h1>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium tracking-wide uppercase">
              <button onClick={() => navigateTo('home')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'home' && "text-brand-gold")}>ראשי</button>
              <button onClick={() => navigateTo('treatments')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'treatments' && "text-brand-gold")}>טיפולים</button>
              <button onClick={() => navigateTo('store')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'store' && "text-brand-gold")}>חנות</button>
              <button onClick={() => navigateTo('booking')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'booking' && "text-brand-gold")}>קביעת תורים</button>
              <button onClick={() => navigateTo('blog')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'blog' && "text-brand-gold")}>בלוג</button>
              <button onClick={() => navigateTo('consultation')} className={cn("hover:text-brand-gold transition-colors", currentPage === 'consultation' && "text-brand-gold")}>ייעוץ אישי</button>
              {isAdmin && (
                <button
                  onClick={() => navigateTo('admin')}
                  className={cn("hover:text-brand-gold transition-colors", currentPage === 'admin' && "text-brand-gold")}
                >
                  אזור ניהול
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {cart.length > 0 && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-brand-dark hover:text-brand-gold transition-colors"
              >
                <ShoppingBag size={22} />
                 <span className="absolute -top-1 -right-1 bg-brand-gold text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {cart.reduce(
                    (total, item) => total + (item.quantity || 1),
                    0,
                  )}
                </span>
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigateTo('profile')}
                  className={cn("text-xs font-bold hover:text-brand-gold transition-colors hidden sm:inline", currentPage === 'profile' ? "text-brand-gold" : "text-brand-dark/60")}
                >
                  שלום, {profile?.name || 'משתמשת'}
                </button>
                <button 
                  onClick={logout}
                  className="p-2 rounded-full hover:bg-brand-beige text-brand-dark transition-colors"
                  title="התנתקות"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthForm(true)}
                className="flex items-center gap-2 text-sm font-bold text-brand-gold hover:text-brand-gold/80 transition-colors"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline">התחברות</span>
              </button>
            )}
            <button 
              onClick={() => navigateTo('booking')}
              className="bg-brand-gold text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-brand-gold/90 transition-all shadow-md"
            >
              הזמיני תור
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="pt-20">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <HomePage key="home" onNavigate={navigateTo} />}
          {currentPage === 'treatments' && (
            <TreatmentsPage 
              key="treatments" 
              treatments={treatments} 
              reviews={reviews} 
              user={user} 
              profile={profile} 
              onAddReview={addReview} 
            />
          )}
          {currentPage === 'store' && (
            <StorePage 
              key="store" 
              onAddToCart={addToCart} 
              cartCount={cart.length} 
              onCheckout={handlePlaceOrder}
            />
          )}
          {currentPage === 'booking' && (
            <BookingPage 
              key="booking" 
              onBook={bookAppointment} 
              user={user} 
              profile={profile} 
              onNavigate={navigateTo} 
              allScheduledAppointments={allScheduledAppointments}
            />
          )}
          {currentPage === 'blog' && <BlogPage key="blog" posts={blogPosts} />}
          {currentPage === 'consultation' && <ConsultationPage key="consultation" onOpenAssistant={() => setIsAssistantOpen(true)} />}
          {currentPage === 'profile' && <ProfilePage key="profile" profile={profile} appointments={appointments} orders={orders} onCancelAppointment={(id) => updateAppointmentStatus(id, 'cancelled')} />}
          {currentPage === 'admin' && isAdmin && (
            <AdminDashboard 
              key="admin" 
              appointments={appointments} 
              orders={orders} 
              products={products}
              blogPosts={blogPosts}
              reviews={reviews}
              treatments={treatments}
              onUpdateAppointment={updateAppointmentStatus}
              onUpdateOrder={updateOrderStatus}
              onAddBlogPost={addBlogPost}
              onDeleteBlogPost={deleteBlogPost}
              onUpdateReview={updateReviewStatus}
              onDeleteReview={deleteReview}
              onAddTreatment={addTreatment}
              onDeleteTreatment={deleteTreatment}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-brand-gold/10 py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-xl serif font-semibold text-brand-gold">Aesthetics Clinic</h3>
            <p className="text-sm text-brand-dark/60 leading-relaxed">
              הקליניקה המובילה לאסתטיקה וטיפוח העור. אנחנו משלבים טכנולוגיה מתקדמת עם יחס אישי ומקצועי.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-brand-gold">ניווט מהיר</h4>
            <ul className="space-y-2 text-sm text-brand-dark/60">
              <li><button onClick={() => navigateTo('home')}>ראשי</button></li>
              <li><button onClick={() => navigateTo('treatments')}>טיפולים</button></li>
              <li><button onClick={() => navigateTo('store')}>חנות מוצרים</button></li>
              <li><button onClick={() => navigateTo('booking')}>קביעת תורים</button></li>
              <li><button onClick={() => navigateTo('blog')}>בלוג</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-brand-gold">צור קשר</h4>
            <ul className="space-y-2 text-sm text-brand-dark/60">
              <li className="flex items-center gap-2"><MapPin size={14} /> רחוב המלכים 12, תל אביב</li>
              <li className="flex items-center gap-2"><Phone size={14} /> 03-1234567</li>
              <li className="flex items-center gap-2"><Clock size={14} /> א'-ה' 09:00-19:00</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-brand-gold">עקבו אחרינו</h4>
            <div className="flex gap-4">
              <Instagram size={20} className="text-brand-gold cursor-pointer" />
              <Facebook size={20} className="text-brand-gold cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Assistant Button */}
      <button 
        onClick={() => {
          setIsAssistantOpen(true);
          setHasNewMessage(false);
        }}
        className="fixed bottom-8 left-8 z-50 w-16 h-16 bg-brand-gold text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
      >
        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
        {hasNewMessage && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">1</span>
        )}
      </button>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-brand-gold/10 flex items-center justify-between bg-brand-beige/30">
                <h3 className="text-xl serif font-semibold">סל הקניות שלך</h3>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-brand-gold/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item, idx) => {
                  // חילוץ המחיר כמספר (מטפל גם בסטרינג עם ₪ וגם במספר נקי)
                  const itemPrice =
                    typeof item.price === "string"
                      ? parseFloat(item.price.replace("₪", ""))
                      : item.price;

                  return (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-4 p-3 bg-brand-beige/20 rounded-2xl border border-brand-gold/5"
                    >
                      <img
                        src={
                          item.img ||
                          item.imageUrl ||
                          "https://picsum.photos/seed/cosmetics/100/100"
                        }
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className="text-xs text-brand-dark/60">
                          {item.brand}
                        </p>

                        {/* תצוגת כמות ומחיר פריט */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full font-bold">
                            כמות: {item.quantity || 1}
                          </span>
                          <p className="text-brand-gold font-bold text-sm">
                            ₪{(itemPrice * (item.quantity || 1)).toFixed(0)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-red-400 hover:text-red-600 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-brand-beige/30 border-t border-brand-gold/10 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>סה"כ לתשלום:</span>
                  <span className="text-brand-gold">
                    ₪
                    {cart
                      .reduce((sum, item) => {
                        const price =
                          typeof item.price === "string"
                            ? parseFloat(item.price.replace("₪", ""))
                            : item.price;
                        // מכפילים את מחיר הפריט בכמות שלו (אם אין כמות, ברירת המחדל היא 1)
                        const qty = item.quantity || 1;
                        return sum + price * qty;
                      }, 0)
                      .toFixed(0)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    handlePlaceOrder();
                  }}
                  className="w-full bg-brand-gold text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-gold/90 transition-all shadow-lg"
                >
                  אישור והזמנה
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isAssistantOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-start p-4 pb-6 md:px-8 md:pt-8 md:pb-8 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-brand-gold/20 h-[70vh] md:h-[500px]"
            >
              {/* Assistant Header */}
              <div className="bg-brand-gold p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">אסיסטנטית Aesthetics</h3>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">מחוברת כעת</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsAssistantOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-beige/30">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-brand-gold text-white rounded-tr-none" 
                        : "bg-white text-brand-dark border border-brand-gold/10 rounded-tl-none shadow-sm"
                    )}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-end">
                    <div className="bg-white border border-brand-gold/10 p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1 h-1 bg-brand-gold/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 bg-brand-gold/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 bg-brand-gold/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-brand-gold/10 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="איך אוכל לעזור?"
                    className="w-full bg-brand-beige/50 border border-brand-gold/20 rounded-full py-3 pr-4 pl-12 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-brand-gold text-white rounded-full flex items-center justify-center hover:bg-brand-gold/90 disabled:opacity-50 transition-all"
                  >
                    <Send size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="space-y-20"
    >
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1570172619380-41067eeec9d2?auto=format&fit=crop&q=80&w=1920" 
            alt="Clinic Interior" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-beige/80 via-transparent to-brand-beige" />
        </div>
        
        <div className="relative z-10 text-center space-y-8 px-6 max-w-4xl">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-6xl md:text-8xl serif font-light tracking-tight text-brand-dark leading-tight">
              יופי שמתחיל <br /> <span className="text-brand-gold italic">מבפנים</span>
            </h2>
          </motion.div>
          <motion.p 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-brand-dark/70 max-w-2xl mx-auto leading-relaxed"
          >
            קליניקת Aesthetics מציעה את הטיפולים המתקדמים ביותר בעולם האסתטיקה, בשילוב טכנולוגיה חדשנית ויחס אישי לכל מטופלת.
          </motion.p>
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button 
              onClick={() => onNavigate('booking')}
              className="bg-brand-dark text-white px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl"
            >
              הזמיני תור עכשיו
            </button>
            <button 
              onClick={() => onNavigate('treatments')}
              className="bg-white border border-brand-gold text-brand-gold px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-white transition-all shadow-lg"
            >
              צפי בטיפולים
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-md text-brand-gold">
            <Star size={32} />
          </div>
          <h3 className="text-xl serif font-semibold">מקצועיות ללא פשרות</h3>
          <p className="text-sm text-brand-dark/60 leading-relaxed">הצוות שלנו מורכב ממומחים בעלי ניסיון רב בתחום האסתטיקה והקוסמטיקה.</p>
        </div>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-md text-brand-gold">
            <Sparkles size={32} />
          </div>
          <h3 className="text-xl serif font-semibold">טכנולוגיה מתקדמת</h3>
          <p className="text-sm text-brand-dark/60 leading-relaxed">אנחנו משתמשים במכשור החדיש ביותר בעולם כדי להבטיח תוצאות מושלמות.</p>
        </div>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-md text-brand-gold">
            <User size={32} />
          </div>
          <h3 className="text-xl serif font-semibold">יחס אישי</h3>
          <p className="text-sm text-brand-dark/60 leading-relaxed">כל מטופלת מקבלת תוכנית טיפולים מותאמת אישית לצרכים ולמטרות שלה.</p>
        </div>
      </section>

      {/* Featured Treatments */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl serif font-semibold">הטיפולים הפופולריים שלנו</h2>
            <div className="w-24 h-1 bg-brand-gold mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'טיפול פנים קלאסי', img: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800' },
              { title: 'הזרקות אסתטיות', img: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800' },
              { title: 'טיפול באקנה', img: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&q=80&w=800' },
            ].map((t, idx) => (
              <div key={idx} className="group cursor-pointer overflow-hidden rounded-3xl relative aspect-[3/4]">
                <img src={t.img} alt={t.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent flex flex-col justify-end p-8 text-white">
                  <h4 className="text-2xl serif font-medium">{t.title}</h4>
                  <p className="text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-2">למידע נוסף והזמנה &larr;</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function TreatmentsPage({ treatments: clinicTreatments, reviews, user, profile, onAddReview }: { treatments: any[], reviews: any[], user: any, profile: any, onAddReview: (d: any) => void }) {
  const defaultTreatments = [
    { id: '1', name: 'טיפול פנים עמוק', desc: 'ניקוי יסודי של עור הפנים, הוצאת קומדונים והחדרת לחות.', price: '₪350' },
    { id: '2', name: 'מזותרפיה', desc: 'טיפול לחידוש מרקם העור, טשטוש צלקות וקמטוטים.', price: '₪600' },
    { id: '3', name: 'פילינג כימי', desc: 'קילוף מבוקר של שכבות העור לחידוש והבהרה.', price: '₪450' },
    { id: '4', name: 'טיפול אנטי-אייג\'ינג', desc: 'שילוב טכנולוגיות להרמה ומיצוק עור הפנים.', price: '₪550' },
  ];

  const displayTreatments = clinicTreatments.length > 0 ? clinicTreatments : defaultTreatments;
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const getTreatmentStats = (treatmentName: string) => {
    const treatmentReviews = reviews.filter(r => r.treatmentId === treatmentName && r.status === 'approved');
    if (treatmentReviews.length === 0) return { rating: 5.0, count: 0 };
    const sum = treatmentReviews.reduce((acc, r) => acc + r.rating, 0);
    return { 
      rating: (sum / treatmentReviews.length).toFixed(1), 
      count: treatmentReviews.length 
    };
  };

  const handleReviewSubmit = () => {
    if (!user) {
      toast.error('אנא התחברי כדי להשאיר ביקורת');
      return;
    }
    onAddReview({
      treatmentId: selectedTreatment.name,
      userId: user.uid,
      userName: profile?.name || 'משתמשת',
      rating: reviewForm.rating,
      comment: reviewForm.comment
    });
    toast.success('הביקורת נשלחה לאישור המנהלת. תודה!');
    setSelectedTreatment(null);
    setReviewForm({ rating: 5, comment: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl serif font-semibold">מידע על טיפולים</h2>
        <p className="text-brand-dark/60">גלי את מגוון הטיפולים המקצועיים שלנו ומה הלקוחות חושבות</p>
      </div>
      <div className="grid gap-6">
        {displayTreatments.map((t, idx) => {
          const stats = getTreatmentStats(t.name);
          return (
            <div key={t.id || idx} className="bg-white p-8 rounded-3xl border border-brand-gold/10 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-xl transition-shadow">
              <div className="space-y-2 text-center md:text-right flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <div className="flex text-brand-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < Math.floor(Number(stats.rating)) ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-brand-gold">{stats.rating} ({stats.count} ביקורות)</span>
                </div>
                <h3 className="text-2xl serif font-medium text-brand-gold">{t.name}</h3>
                <p className="text-brand-dark/60">{t.desc || t.description}</p>
                
                <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                  <button 
                    onClick={() => setSelectedTreatment(t)}
                    className="text-xs font-bold uppercase tracking-widest text-brand-gold hover:underline"
                  >
                    הוסיפי ביקורת
                  </button>
                  {reviews.filter(r => r.treatmentId === t.name && r.status === 'approved').length > 0 && (
                    <button className="text-xs font-bold uppercase tracking-widest text-brand-dark/40 hover:text-brand-dark transition-colors">
                      צפי בכל הביקורות
                    </button>
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-dark">{t.price}</div>
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedTreatment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl serif font-semibold">איך היה הטיפול?</h3>
                <p className="text-brand-dark/60">{selectedTreatment.name}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className={cn("transition-transform hover:scale-110", reviewForm.rating >= star ? "text-brand-gold" : "text-gray-200")}
                    >
                      <Star size={32} fill={reviewForm.rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>

                <textarea 
                  placeholder="ספרי לנו על החוויה שלך..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleReviewSubmit}
                  className="flex-1 bg-brand-gold text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-gold/90 transition-all"
                >
                  שלחי ביקורת
                </button>
                <button 
                  onClick={() => setSelectedTreatment(null)}
                  className="flex-1 bg-brand-beige text-brand-dark py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-beige/80 transition-all"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BookingPage({ onBook, user, profile, onNavigate, allScheduledAppointments }: { onBook: (d: any) => void, user: any, profile: any, onNavigate: (p: Page) => void, allScheduledAppointments: any[] }) {
  const [bookingData, setBookingData] = useState({ treatment: 'טיפול פנים קלאסי', date: '', time: '' });

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const availableTimes = useMemo(() => {
    if (!bookingData.date) return [];
    const takenTimes = allScheduledAppointments
      .filter(app => app.date === bookingData.date)
      .map(app => app.time);
    return timeSlots.filter(time => !takenTimes.includes(time));
  }, [bookingData.date, allScheduledAppointments]);

  const handleSubmit = async () => {
    if (!user) {
      alert('אנא התחברי כדי לקבוע תור');
      return;
    }
    if (!bookingData.date || !bookingData.time) {
      alert('אנא בחרי תאריך ושעה');
      return;
    }
    await onBook({
      clientUid: user.uid,
      clientName: profile?.name || 'User',
      treatmentName: bookingData.treatment,
      date: bookingData.date,
      time: bookingData.time
    });
    onNavigate('profile');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl serif font-semibold">קביעת תורים</h2>
        <p className="text-brand-dark/60">בחרי את הטיפול והזמן המתאים לך</p>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-brand-gold/10 shadow-xl space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">בחרי טיפול</label>
          <select 
            value={bookingData.treatment}
            onChange={(e) => setBookingData({...bookingData, treatment: e.target.value})}
            className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          >
            <option>טיפול פנים קלאסי</option>
            <option>מזותרפיה</option>
            <option>פילינג כימי</option>
            <option>הזרקות אסתטיות</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">תאריך</label>
            <input 
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              value={bookingData.date}
              onChange={(e) => setBookingData({...bookingData, date: e.target.value, time: ''})}
              className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/30" 
            />
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-brand-gold">שעה</label>
            <select 
              value={bookingData.time}
              onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
              disabled={!bookingData.date}
              className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 disabled:opacity-50"
            >
              <option value="">בחרי שעה</option>
              {availableTimes.length > 0 ? (
                availableTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))
              ) : bookingData.date ? (
                <option disabled>אין זמנים פנויים בתאריך זה</option>
              ) : (
                <option disabled>בחרי תאריך קודם</option>
              )}
            </select>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={!bookingData.date || !bookingData.time}
          className="w-full bg-brand-gold text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-gold/90 transition-all shadow-lg disabled:opacity-50"
        >
          אישור והזמנה
        </button>
      </div>
    </motion.div>
  );
}

function ProfilePage({ profile, appointments, orders, onCancelAppointment }: { profile: any, appointments: any[], orders: any[], onCancelAppointment: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <div className="bg-white p-8 rounded-3xl border border-brand-gold/10 shadow-lg flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold">
          <User size={48} />
        </div>
        <div className="space-y-2 text-center md:text-right">
          <h2 className="text-3xl serif font-semibold">{profile?.name}</h2>
          <p className="text-brand-dark/60">{profile?.email}</p>
          <div className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold text-xs font-bold rounded-full uppercase tracking-widest">
            לקוחה
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-2xl serif font-semibold flex items-center gap-2">
            <Calendar size={20} className="text-brand-gold" /> התורים שלי
          </h3>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-brand-dark/40 italic">אין תורים עתידיים</p>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-2xl border border-brand-gold/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{app.treatmentName}</h4>
                    <p className="text-xs text-brand-dark/60">{app.date} בשעה {app.time}</p>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-2 inline-block",
                      app.status === 'scheduled' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {app.status === 'scheduled' ? 'מאושר' : 'מבוטל'}
                    </span>
                  </div>
                  {app.status === 'scheduled' && (
                    <button 
                      onClick={() => onCancelAppointment(app.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl serif font-semibold flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-gold" /> ההזמנות שלי
          </h3>
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-brand-dark/40 italic">אין הזמנות קודמות</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-2xl border border-brand-gold/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold">הזמנה #{order.id.slice(-6)}</h4>
                      <p className="text-xs text-brand-dark/60">סה"כ: ₪{order.totalPrice}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-brand-gold/10 text-brand-gold rounded-full">
                      {order.status === 'pending' ? 'בטיפול' : order.status}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="w-12 h-12 rounded-lg bg-brand-beige overflow-hidden flex-shrink-0">
                        <img src={item.img} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminDashboard({ 
  appointments, orders, products, blogPosts, reviews, treatments,
  onUpdateAppointment, onUpdateOrder, onAddBlogPost, onDeleteBlogPost,
  onUpdateReview, onDeleteReview, onAddTreatment, onDeleteTreatment
}: any) {
  const [tab, setTab] = useState<'appointments' | 'orders' | 'products' | 'blog' | 'reviews' | 'treatments' | 'users'>('appointments');
  const [newPost, setNewPost] = useState({ title: '', content: '', author: 'הקוסמטיקאית שלך' });
  const [newTreatment, setNewTreatment] = useState({ name: '', description: '', price: '' });

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) return;
    await onAddBlogPost(newPost);
    setNewPost({ title: '', content: '', author: 'הקוסמטיקאית שלך' });
  };

  const handleAddTreatment = async () => {
    if (!newTreatment.name || !newTreatment.price) return;
    await onAddTreatment(newTreatment);
    setNewTreatment({ name: '', description: '', price: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl serif font-semibold">ניהול קליניקה</h2>
        <div className="flex justify-center gap-4 flex-wrap">
          <button onClick={() => setTab('appointments')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'appointments' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>תורים</button>
          <button onClick={() => setTab('orders')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'orders' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>הזמנות</button>
          <button onClick={() => setTab('products')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'products' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>מוצרים</button>
          <button onClick={() => setTab('blog')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'blog' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>בלוג</button>
          <button onClick={() => setTab('reviews')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'reviews' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>ביקורות</button>
          <button onClick={() => setTab('treatments')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'treatments' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>טיפולים</button>
          <button onClick={() => setTab('users')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", tab === 'users' ? "bg-brand-gold text-white" : "bg-white text-brand-dark")}>משתמשים</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-brand-gold/10 shadow-xl overflow-hidden">
        {tab === 'appointments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
                <tr>
                  <th className="p-6">לקוחה</th>
                  <th className="p-6">טיפול</th>
                  <th className="p-6">תאריך ושעה</th>
                  <th className="p-6">סטטוס</th>
                  <th className="p-6">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gold/10">
                {appointments.map((app: any) => (
                  <tr key={app.id}>
                    <td className="p-6 font-bold">{app.clientName}</td>
                    <td className="p-6">{app.treatmentName}</td>
                    <td className="p-6 text-sm">{app.date} | {app.time}</td>
                    <td className="p-6">
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", app.status === 'scheduled' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button onClick={() => onUpdateAppointment(app.id, 'completed')} className="p-2 hover:bg-green-50 text-green-600 rounded-full"><CheckCircle2 size={18} /></button>
                        <button onClick={() => onUpdateAppointment(app.id, 'cancelled')} className="p-2 hover:bg-red-50 text-red-600 rounded-full"><X size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'orders' && <OrderManagement />}

        {tab === 'products' && (
          <div className="p-8 text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((p: any) => (
                <div key={p.id} className="bg-brand-beige/30 p-6 rounded-2xl border border-brand-gold/10 flex justify-between items-center">
                  <div className="text-right">
                    <h4 className="font-bold">{p.name}</h4>
                    <p className="text-xs text-brand-dark/60">מלאי: {p.stock || 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white rounded-full"><Edit3 size={18} /></button>
                    <button className="p-2 hover:bg-red-50 text-red-500 rounded-full"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button className="bg-brand-gold text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
              הוספת מוצר חדש
            </button>
          </div>
        )}

        {tab === 'blog' && (
          <div className="p-8 space-y-8">
            <div className="bg-brand-beige/30 p-6 rounded-3xl space-y-4">
              <h3 className="text-xl font-bold">פוסט חדש</h3>
              <input 
                type="text" 
                placeholder="כותרת הפוסט"
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="w-full p-4 rounded-xl border border-brand-gold/20 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              />
              <textarea 
                placeholder="תוכן הפוסט..."
                rows={4}
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                className="w-full p-4 rounded-xl border border-brand-gold/20 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              />
              <button 
                onClick={handleAddPost}
                className="bg-brand-gold text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
              >
                פרסמי פוסט
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">פוסטים קיימים</h3>
              {blogPosts.map((post: any) => (
                <div key={post.id} className="bg-white p-6 rounded-2xl border border-brand-gold/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold">{post.title}</h4>
                    <p className="text-xs text-brand-dark/60">{formatDisplayDate(post.createdAt)}</p>
                  </div>
                  <button 
                    onClick={() => onDeleteBlogPost(post.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
                <tr>
                  <th className="p-6">לקוחה</th>
                  <th className="p-6">טיפול</th>
                  <th className="p-6">דירוג</th>
                  <th className="p-6">סטטוס</th>
                  <th className="p-6">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gold/10">
                {reviews.map((review: any) => (
                  <tr key={review.id}>
                    <td className="p-6 font-bold">{review.userName}</td>
                    <td className="p-6 text-sm">{review.treatmentId}</td>
                    <td className="p-6">
                      <div className="flex text-brand-gold">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        review.status === 'approved' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {review.status === 'approved' ? 'מאושר' : 'ממתין'}
                      </span>
                    </td>
                    <td className="p-6 flex gap-2">
                      {review.status === 'pending' && (
                        <button onClick={() => onUpdateReview(review.id, 'approved')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><CheckCircle2 size={16} /></button>
                      )}
                      <button onClick={() => onDeleteReview(review.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && <UserManagement />}

        {tab === 'treatments' && (
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl serif font-semibold">טיפול חדש</h3>
                <input 
                  placeholder="שם הטיפול" 
                  value={newTreatment.name}
                  onChange={(e) => setNewTreatment({...newTreatment, name: e.target.value})}
                  className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4"
                />
                <textarea 
                  placeholder="תיאור" 
                  value={newTreatment.description}
                  onChange={(e) => setNewTreatment({...newTreatment, description: e.target.value})}
                  className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4 h-32"
                />
                <input 
                  placeholder="מחיר (₪)" 
                  value={newTreatment.price}
                  onChange={(e) => setNewTreatment({...newTreatment, price: e.target.value})}
                  className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-xl p-4"
                />
                <button onClick={handleAddTreatment} className="w-full bg-brand-gold text-white py-4 rounded-xl font-bold uppercase tracking-widest">הוסיפי טיפול</button>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl serif font-semibold">טיפולים קיימים</h3>
                {treatments.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-4 bg-brand-beige/20 rounded-2xl">
                    <div>
                      <span className="font-bold block">{t.name}</span>
                      <span className="text-xs text-brand-dark/60">{t.price}</span>
                    </div>
                    <button onClick={() => onDeleteTreatment(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BlogPage({ posts }: { posts: any[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl serif font-semibold">הבלוג של הקליניקה</h2>
        <p className="text-brand-dark/60">טיפים, המלצות ומידע מקצועי מעולם האסתטיקה</p>
      </div>
      <div className="space-y-12">
        {posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-brand-gold/10 italic text-brand-dark/40">
            בקרוב יעלו פוסטים חדשים...
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="bg-white p-8 md:p-12 rounded-[40px] border border-brand-gold/10 shadow-xl space-y-6 hover:shadow-2xl transition-shadow">
              <div className="space-y-2">
                <div className="text-xs font-bold text-brand-gold uppercase tracking-widest">{formatDisplayDate(post.createdAt)}</div>
                <h3 className="text-3xl serif font-semibold text-brand-dark">{post.title}</h3>
              </div>
              <div className="prose prose-brand max-w-none text-brand-dark/70 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
              <div className="pt-6 border-t border-brand-gold/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <User size={20} />
                </div>
                <div className="text-sm font-bold">{post.author}</div>
              </div>
            </article>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ConsultationPage({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const [formData, setFormData] = useState({ name: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) {
      toast.error('אנא מלאי את כל השדות');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSupabaseData(formData.name, formData.message);
      toast.success('ההודעה נשמרה בהצלחה ב-Supabase דרך הבקאנד!');
      setFormData({ name: '', message: '' });
    } catch (error) {
      toast.error('חלה שגיאה בשמירת הנתונים. וודאי שהבקאנד פועל.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto px-6 py-12 space-y-20">
      <div className="text-center space-y-4">
        <h2 className="text-4xl serif font-semibold">ייעוץ מוצרים אישי</h2>
        <p className="text-brand-dark/60">התאימי את שגרת הטיפוח המושלמת עבורך בעזרת הבינה המלאכותית שלנו</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h3 className="text-3xl serif font-medium leading-tight">הכירי את אסיסטנטית היופי שלך</h3>
          <p className="text-brand-dark/70 leading-relaxed">
            האסיסטנטית הווירטואלית שלנו פותחה במיוחד כדי לעזור לך להבין את סוג העור שלך ולהמליץ על המוצרים והטיפולים המדויקים ביותר עבורך.
            היא זמינה 24/7 לכל שאלה שיש לך בנושא טיפוח ואסתטיקה.
          </p>
          <ul className="space-y-3 text-sm font-medium">
            <li className="flex items-center gap-2 text-brand-gold"><Sparkles size={16} /> התאמת מוצרים לפי סוג עור</li>
            <li className="flex items-center gap-2 text-brand-gold"><Sparkles size={16} /> המלצות על שגרת בוקר וערב</li>
            <li className="flex items-center gap-2 text-brand-gold"><Sparkles size={16} /> מענה על שאלות בנושא רכיבים פעילים</li>
          </ul>
          <button 
            onClick={onOpenAssistant}
            className="bg-brand-dark text-white px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl flex items-center gap-3"
          >
            התחילי ייעוץ עכשיו <MessageCircle size={18} />
          </button>
        </div>
        <div className="relative">
          <div className="aspect-square rounded-full overflow-hidden border-8 border-white shadow-2xl">
            <img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800" alt="Consultation" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-brand-gold/10 max-w-[200px]">
            <div className="flex gap-1 text-brand-gold mb-2">
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
              <Star size={12} fill="currentColor" />
            </div>
            <p className="text-[10px] font-medium leading-relaxed italic">"הייעוץ עזר לי מאוד להבין איזה מוצרים באמת מתאימים לי. מומלץ בחום!"</p>
          </div>
        </div>
      </div>

      {/* Supabase Contact Form Section */}
      <div className="bg-white rounded-[40px] p-8 md:p-16 border border-brand-gold/10 shadow-2xl space-y-12">
        <div className="text-center space-y-4">
          <h3 className="text-3xl serif font-semibold">השאירי פרטים לייעוץ אנושי</h3>
          <p className="text-brand-dark/60">הפרטים יישמרו ישירות ב-Supabase דרך שרת ה-Backend שלנו</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-brand-gold">שם מלא</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="ישראל ישראלי"
              className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-brand-gold">הודעה / תוכן</label>
            <textarea 
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="ספרי לנו במה נוכל לעזור..."
              rows={4}
              className="w-full bg-brand-beige/30 border border-brand-gold/20 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-gold text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-brand-gold/90 transition-all shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? 'שולח...' : 'שליחה ל-Supabase'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
