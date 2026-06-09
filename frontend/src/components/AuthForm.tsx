import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, X, Mail, Lock, Phone, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

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
      } else {
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
            {mode === 'login' ? <LogIn size={26} /> : <UserPlus size={26} />}
          </div>
          <h2 className="serif text-2xl font-semibold text-brand-dark">
            {mode === 'login' ? 'ברוכה השבה' : 'הצטרפי אלינו'}
          </h2>
          <p className="mt-1 text-sm text-brand-dark/60">
            {mode === 'login'
              ? 'התחברי לחשבון שלך ב-Aesthetics Clinic'
              : 'צרי חשבון חדש וקבלי גישה לכל השירותים'}
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
            className="w-full rounded-xl bg-brand-gold py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {mode === 'login' ? 'מתחברת...' : 'נרשמת...'}
              </span>
            ) : mode === 'login' ? (
              'התחברי'
            ) : (
              'הירשמי'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
