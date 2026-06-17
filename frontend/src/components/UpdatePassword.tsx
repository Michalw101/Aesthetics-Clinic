import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { X, Lock, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface UpdatePasswordProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdatePassword({ onClose, onSuccess }: UpdatePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // וולידציה בצד הלקוח (Task 3)
    if (password.length < 6) {
      setError('הסיסמה החדשה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות. אנא נסי שוב.');
      return;
    }

    setSubmitting(true);
    try {
      // עדכון הסיסמה במסד הנתונים מול Supabase (Task 4)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        toast.success('הסיסמה שלך עודכנה בהצלחה!', { position: 'top-center' });
        onSuccess();
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
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 rounded-full p-2 text-brand-dark/50 transition-colors hover:bg-brand-beige hover:text-brand-dark"
        >
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-brand-gold/10 via-white to-brand-beige px-8 pt-10 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            <KeyRound size={26} />
          </div>
          <h2 className="serif text-2xl font-semibold text-brand-dark">
            בחירת סיסמה חדשה
          </h2>
          <p className="mt-1 text-sm text-brand-dark/60">
            הקלידי את הסיסמה החדשה לחשבון שלך
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 py-8">
          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
            <input
              type="password"
              placeholder="סיסמה חדשה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
              minLength={6}
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60" />
            <input
              type="password"
              placeholder="אימות סיסמה חדשה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
              minLength={6}
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-gold py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            {submitting ? 'מעדכן...' : 'עדכני סיסמה'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}