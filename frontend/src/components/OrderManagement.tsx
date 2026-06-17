import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Package,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDisplayDateTime } from '../lib/format';
import {
  fetchAdminOrders,
  isValidAdminOrder,
  normalizeOrderId,
  updateAdminOrderStatus,
  type AdminOrderDto,
} from '../lib/api';
import { supabase } from '../lib/supabase';

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!session?.access_token) {
    throw new Error('לא נמצאה התחברות פעילה. אנא התחברי מחדש.');
  }
  return session.access_token;
}

function isValidOrder(order: AdminOrderDto | null | undefined): order is AdminOrderDto {
  return isValidAdminOrder(order);
}

function orderDate(order: AdminOrderDto): string {
  return formatDisplayDateTime(order.created_at ?? order.date);
}

function formatOrderId(orderId: string | number): string {
  const id = normalizeOrderId(orderId);
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-brand-beige text-brand-dark/60';
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  switch (status) {
    case 'pending':
      return 'ממתין';
    case 'approved':
      return 'מאושר';
    case 'rejected':
      return 'נדחה';
    default:
      return status;
  }
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
          <tr>
            <th className="p-6">מזהה הזמנה</th>
            <th className="p-6">תאריך</th>
            <th className="p-6">שם לקוחה</th>
            <th className="p-6">טלפון</th>
            <th className="p-6">מזהה מוצר</th>
            <th className="p-6">כמות</th>
            <th className="p-6">סטטוס</th>
            <th className="p-6">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-gold/10">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="p-6"><div className="h-4 w-24 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-36 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-32 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-28 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-24 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-4 w-12 rounded-lg bg-brand-beige" /></td>
              <td className="p-6"><div className="h-6 w-16 rounded-full bg-brand-beige" /></td>
              <td className="p-6"><div className="h-8 w-32 rounded-lg bg-brand-beige" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ActionType = 'approve' | 'reject';

export default function OrderManagement() {
  console.log('>>> OrderManagement Component is rendering! <<<'); // <--- נוסיף את זה פה
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    orderId: string;
    action: ActionType;
  } | null>(null);

  const loadOrders = async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const token = await getAccessToken();
      const data = await fetchAdminOrders(token);
      setOrders(Array.isArray(data) ? data.filter(isValidOrder) : []);
      if (!options?.silent) setError(null);
    } catch (err) {
      if (!options?.silent) {
        setOrders([]);
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הזמנות');
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
    void loadOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, action: ActionType) => {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    setActionLoading({ orderId, action });
    setActionError(null);

    try {
      const token = await getAccessToken();
      await updateAdminOrderStatus(token, orderId, newStatus);
      await loadOrders({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס הזמנה',
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center justify-between px-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-dark">ניהול הזמנות</h3>
              <p className="text-sm text-brand-dark/50">טוען נתונים...</p>
            </div>
          </div>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-gold border-t-transparent" />
        </div>
        <TableSkeleton />
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
          <h3 className="text-lg font-bold text-brand-dark">לא ניתן לטעון הזמנות</h3>
          <p className="text-sm leading-relaxed text-brand-dark/60">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-gold/90"
        >
          <RefreshCw size={16} />
          נסי שוב
        </button>
      </div>
    );
  }

  const validOrders = orders.filter(isValidOrder);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-4 px-8 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
            <Package size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-dark">ניהול הזמנות</h3>
            <p className="text-sm text-brand-dark/50">
              {validOrders.length} הזמנות במערכת
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders({ silent: true })}
          disabled={refreshing || actionLoading != null}
          className="inline-flex items-center gap-2 self-start rounded-full border border-brand-gold/20 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-gold/40 hover:text-brand-gold disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          {refreshing ? 'מרענן...' : 'רענון'}
        </button>
      </div>

      {actionError && (
        <div className="mx-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div
        className={cn(
          'overflow-x-auto transition-opacity duration-300',
          refreshing && 'opacity-60',
        )}
      >
        <table className="w-full min-w-[960px] text-right">
          <thead className="bg-brand-beige/50 text-xs uppercase tracking-widest text-brand-gold">
            <tr>
              <th className="p-6">מזהה הזמנה</th>
              <th className="p-6">תאריך</th>
              <th className="p-6">שם לקוחה</th>
              <th className="p-6">טלפון</th>
              <th className="p-6">מזהה מוצר</th>
              <th className="p-6">כמות</th>
              <th className="p-6">סטטוס</th>
              <th className="p-6">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-gold/10">
            {validOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-sm text-brand-dark/50">
                  לא נמצאו הזמנות במערכת
                </td>
              </tr>
            ) : (
              validOrders.map((order) => {
                const orderId = normalizeOrderId(order.order_id);
                const isApproving =
                  actionLoading?.orderId === orderId &&
                  actionLoading?.action === 'approve';
                const isRejecting =
                  actionLoading?.orderId === orderId &&
                  actionLoading?.action === 'reject';
                const isPending = order.status === 'pending';
                const isAnyActionLoading = actionLoading != null;

                return (
                  <tr
                    key={orderId}
                    className="transition-colors hover:bg-brand-beige/20"
                  >
                    <td className="p-6 font-mono text-xs text-brand-dark/70" dir="ltr">
                      {formatOrderId(orderId)}
                    </td>
                    <td className="p-6 text-sm text-brand-dark/70">
                      {orderDate(order)}
                    </td>
                    <td className="p-6 font-bold text-brand-dark">
                      {order.customer_name || '—'}
                    </td>
                    <td className="p-6 text-sm text-brand-dark/70" dir="ltr">
                      {order.phone || '—'}
                    </td>
                    <td className="p-6 font-mono text-xs text-brand-dark/70" dir="ltr">
                      {order.product_id || '—'}
                    </td>
                    <td className="p-6 text-sm font-semibold text-brand-dark">
                      {order.quantity ?? '—'}
                    </td>
                    <td className="p-6">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                          statusBadgeClass(order.status),
                        )}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-6">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isAnyActionLoading}
                            onClick={() => void handleStatusUpdate(orderId, 'approve')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 transition-all hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isApproving ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            {isApproving ? 'מאשר...' : 'אשר הזמנה'}
                          </button>
                          <button
                            type="button"
                            disabled={isAnyActionLoading}
                            onClick={() => void handleStatusUpdate(orderId, 'reject')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRejecting ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                            ) : (
                              <XCircle size={14} />
                            )}
                            {isRejecting ? 'דוחה...' : 'דחה הזמנה'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-brand-dark/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
