import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, X, Mail, Lock, Phone, User, KeyRound } from 'lucide-react'; // <--- הוספתי את האייקון KeyRound
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// <--- הוספתי את מצב 'reset' לסוגי הטפסים האפשריים
type AuthMode = 'login' | 'signup' | 'reset';

interface AuthFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  initialMode?: AuthMode;
}

export default function AuthForm({ onClose, onSuccess, initialMode = 'login' }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        onSuccess?.();
      } else if (mode === 'signup') {
        if (!firstName.trim() || !lastName.trim()) {
          setError('נא למלא שם פרטי ושם משפחה');
          return;
        }
        if (!phone.trim()) {
          setError('נא למלא מספר טלפון');
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim(),
            },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setSuccessMessage('נרשמת בהצלחה! בדקי את תיבת האימייל לאישור החשבון.');
      } else if (mode === 'reset') {
        // <--- הלוגיקה החדשה של שליחת אימייל לאיפוס סיסמה
        if (!email.trim()) {
          setError('נא להזין כתובת אימייל');
          return;
        }
        
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/update-password`, // זה הראוט שניצור בהמשך
        });
        
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSuccessMessage('קישור לאיפוס סיסמה נשלח לתיבת המייל שלך!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-brand-gold/20 bg-brand-beige/50 px-4 py-3 pr-11 text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none transition-all focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-brand-gold/20"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-10 rounded-full p-2 text-brand-dark/50 transition-colors hover:bg-brand-beige hover:text-brand-dark"
            aria-label="סגירה"
          >
            <X size={18} />
          </button>
        )}

        <div className="bg-gradient-to-br from-brand-gold/10 via-white to-brand-beige px-8 pt-10 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            {/* <--- תצוגת אייקון משתנה בהתאם למצב */}
            {mode === 'login' ? <LogIn size={26} /> : mode === 'signup' ? <UserPlus size={26} /> : <KeyRound size={26} />}
          </div>
          <h2 className="serif text-2xl font-semibold text-brand-dark">
            {/* <--- כותרת משתנה */}
            {mode === 'login' ? 'ברוכה השבה' : mode === 'signup' ? 'הצטרפי אלינו' : 'שחזור סיסמה'}
          </h2>
          <p className="mt-1 text-sm text-brand-dark/60">
            {/* <--- תיאור משתנה */}
            {mode === 'login'
              ? 'התחברי לחשבון שלך ב-Aesthetics Clinic'
              : mode === 'signup'
              ? 'צרי חשבון חדש וקבלי גישה לכל השירותים'
              : 'הזיני אימייל ונשלח לך קישור לאיפוס הסיסמה'}
          </p>
        </div>

        <div className="flex border-b border-brand-gold/10">
          {(['login', 'signup'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition-all',
                mode === tab
                  ? 'border-b-2 border-brand-gold text-brand-gold'
                  : 'text-brand-dark/50 hover:text-brand-dark/80'
              )}
            >
              {tab === 'login' ? 'התחברות' : 'הרשמה'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 py-6">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
                    <input
                      type="text"
                      placeholder="שם פרטי"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="relative">
                    <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
                    <input
                      type="text"
                      placeholder="שם משפחה"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
                  <input
                    type="tel"
                    placeholder="טלפון"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="tel"
                    dir="ltr"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
              autoComplete="email"
              dir="ltr"
            />
          </div>

          {/* <--- שדה הסיסמה מוצג רק אם אנחנו לא במצב איפוס סיסמה */}
          {mode !== 'reset' && (
            <div className="relative">
              <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
              <input
                type="password"
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                dir="ltr"
              />
            </div>
          )}

          {/* <--- הוספת לינק "שכחתי סיסמה" רק במסך התחברות */}
          {mode === 'login' && (
            <div className="flex justify-start px-1">
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-xs font-semibold text-brand-gold hover:text-brand-dark transition-colors"
              >
                שכחת סיסמה?
              </button>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {successMessage}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-gold py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {mode === 'login' ? 'מתחברת...' : mode === 'signup' ? 'נרשמת...' : 'שולח...'}
              </span>
            ) : mode === 'login' ? (
              'התחברי'
            ) : mode === 'signup' ? (
              'הירשמי'
            ) : (
              'שלחי קישור לאיפוס'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}