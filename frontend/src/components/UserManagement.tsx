import { FormEvent, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  Edit3,
  Phone,
  RefreshCw,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDisplayDateTime } from '../lib/format';
import {
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserDto,
} from '../lib/api';
import { supabase } from '../lib/supabase';

function fullName(user: AdminUserDto): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || '—';
}

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!session?.access_token) {
    throw new Error('לא נמצאה התחברות פעילה. אנא התחברי מחדש.');
  }
  return session.access_token;
}

const inputClass =
  'w-full rounded-xl border border-brand-gold/20 bg-brand-beige/50 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none transition-all focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20';

function TableSkeleton({ withActions = false }: { withActions?: boolean }) {
  const colCount = withActions ? 6 : 5;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
          <tr>
            <th className="p-6">שם מלא</th>
            <th className="p-6">אימייל</th>
            <th className="p-6">טלפון</th>
            <th className="p-6">תפקיד</th>
            <th className="p-6">פעילות אחרונה</th>
            {withActions && <th className="p-6">פעולות</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-gold/10">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="p-6"><div className="h-4 w-32 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-44 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-28 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-6 w-16 rounded-full bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-36 rounded-lg bg-brand-beige" /></td>
              {withActions && (
                <td className="p-6"><div className="h-8 w-20 rounded-lg bg-brand-beige" /></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EditFormState {
  first_name: string;
  last_name: string;
  phone: string;
  is_admin: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    first_name: '',
    last_name: '',
    phone: '',
    is_admin: false,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<AdminUserDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const token = await getAccessToken();
      const data = await fetchAdminUsers(token);
      setUsers(data);
      if (!options?.silent) setError(null);
    } catch (err) {
      if (!options?.silent) {
        setUsers([]);
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים');
      }
    } finally {
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openEditModal = (user: AdminUserDto) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      phone: user.phone ?? '',
      is_admin: user.is_admin,
    });
    setEditError(null);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditingUser(null);
    setEditError(null);
  };

  const openDeleteModal = (user: AdminUserDto) => {
    setDeletingUser(user);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    if (deleteSubmitting) return;
    setDeletingUser(null);
    setDeleteError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const token = await getAccessToken();
      await updateAdminUser(token, editingUser.id, editForm);
      setEditingUser(null);
      await loadUsers({ silent: true });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'שגיאה בעדכון משתמש');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;

    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const token = await getAccessToken();
      await deleteAdminUser(token, deletingUser.id);
      setDeletingUser(null);
      await loadUsers({ silent: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'שגיאה במחיקת משתמש');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center justify-between px-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-dark">ניהול משתמשים</h3>
              <p className="text-sm text-brand-dark/50">טוען נתונים...</p>
            </div>
          </div>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
        </div>
        <TableSkeleton withActions />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertCircle size={32} />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-bold text-brand-dark">לא ניתן לטעון משתמשים</h3>
          <p className="text-sm leading-relaxed text-brand-dark/60">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90"
        >
          <RefreshCw size={16} />
          נסי שוב
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-4 px-8 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-dark">ניהול משתמשים</h3>
            <p className="text-sm text-brand-dark/50">
              {users.length} משתמשים רשומים במערכת
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers({ silent: true })}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-full border border-brand-gold/20 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-gold/40 hover:text-brand-gold disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          {refreshing ? 'מרענן...' : 'רענון'}
        </button>
      </div>

      <div
        className={cn(
          'overflow-x-auto transition-opacity duration-300',
          refreshing && 'opacity-60',
        )}
      >
        <table className="w-full min-w-[800px] text-right">
          <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
            <tr>
              <th className="p-6">שם מלא</th>
              <th className="p-6">אימייל</th>
              <th className="p-6">טלפון</th>
              <th className="p-6">תפקיד</th>
              <th className="p-6">פעילות אחרונה</th>
              <th className="p-6">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gold/10">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm text-brand-dark/50">
                  לא נמצאו משתמשים במערכת
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-brand-beige/20"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-beige text-brand-gold">
                        <User size={16} />
                      </div>
                      <span className="font-bold text-brand-dark">{fullName(user)}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm text-brand-dark/70" dir="ltr">
                    {user.email || '—'}
                  </td>
                  <td className="p-6 text-sm text-brand-dark/70" dir="ltr">
                    {user.phone || '—'}
                  </td>
                  <td className="p-6">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                        user.is_admin
                          ? 'bg-brand-gold/15 text-brand-gold'
                          : 'bg-brand-beige text-brand-dark/60',
                      )}
                    >
                      {user.is_admin ? (
                        <>
                          <Shield size={12} />
                          אדמין
                        </>
                      ) : (
                        'משתמש'
                      )}
                    </span>
                  </td>
                  <td className="p-6 text-sm text-brand-dark/60">
                    {formatDisplayDateTime(user.last_sign_in_at)}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        title="עריכה"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-gold/20 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-all hover:border-brand-gold/40 hover:bg-brand-gold/5 hover:text-brand-gold"
                      >
                        <Edit3 size={14} />
                        עריכה
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(user)}
                        title="מחיקה"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        מחיקה
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
              onClick={closeEditModal}
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
                onClick={closeEditModal}
                disabled={editSubmitting}
                className="absolute left-4 top-4 z-10 rounded-full p-2 text-brand-dark/50 transition-colors hover:bg-brand-beige hover:text-brand-dark disabled:opacity-50"
                aria-label="סגירה"
              >
                <X size={18} />
              </button>

              <div className="bg-gradient-to-br from-brand-gold/10 via-white to-brand-beige px-8 pt-10 pb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
                  <Edit3 size={26} />
                </div>
                <h2 className="serif text-2xl font-semibold text-brand-dark">עריכת משתמש</h2>
                <p className="mt-1 text-sm text-brand-dark/60" dir="ltr">
                  {editingUser.email}
                </p>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 px-8 py-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-brand-dark/70">
                      שם פרטי
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, first_name: e.target.value }))
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-brand-dark/70">
                      שם משפחה
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, last_name: e.target.value }))
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-brand-dark/70">
                    טלפון
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold/60"
                    />
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className={cn(inputClass, 'pr-11')}
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-gold/20 bg-brand-beige/30 px-4 py-3.5 transition-colors hover:bg-brand-beige/50">
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-brand-gold" />
                    <div>
                      <span className="block text-sm font-semibold text-brand-dark">
                        מנהל מערכת
                      </span>
                      <span className="text-xs text-brand-dark/50">
                        הרשאות ניהול מלאות
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editForm.is_admin}
                    onClick={() =>
                      setEditForm((prev) => ({ ...prev, is_admin: !prev.is_admin }))
                    }
                    className={cn(
                      'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                      editForm.is_admin ? 'bg-brand-gold' : 'bg-brand-dark/20',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200',
                        editForm.is_admin && 'translate-x-5',
                      )}
                    />
                  </button>
                </label>

                {editError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {editError}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={editSubmitting}
                    className="flex-1 rounded-xl border border-brand-gold/20 py-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-beige disabled:opacity-60"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 rounded-xl bg-brand-gold py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        מעדכן...
                      </span>
                    ) : (
                      'שמירה'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
              onClick={closeDeleteModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-red-200/60"
            >
              <div className="px-8 pt-10 pb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertTriangle size={28} />
                </div>
                <h2 className="serif text-2xl font-semibold text-brand-dark">מחיקת משתמש</h2>
                <p className="mt-4 text-sm leading-relaxed text-brand-dark/70">
                  האם את בטוחה שברצונך למחוק משתמש זה? פעולה זו היא לצמיתות.
                </p>
                <div className="mt-4 rounded-xl bg-brand-beige/50 px-4 py-3 text-sm">
                  <span className="font-bold text-brand-dark">{fullName(deletingUser)}</span>
                  {deletingUser.email && (
                    <span className="mt-1 block text-brand-dark/60" dir="ltr">
                      {deletingUser.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 px-8 pb-8">
                {deleteError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {deleteError}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={deleteSubmitting}
                    className="flex-1 rounded-xl border border-brand-gold/20 py-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-beige disabled:opacity-60"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConfirm()}
                    disabled={deleteSubmitting}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        מוחק...
                      </span>
                    ) : (
                      'מחקי לצמיתות'
                    )}
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
