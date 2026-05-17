import { useState, useCallback } from 'react';

/** נתוני קליניקה בזיכרון (ללא Firebase). שמירה ל-Supabase רק דרך הבקאנד בצ'אט / טופס ייעוץ. */
export function useClinicData(userId: string | undefined) {
  const [products, setProducts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allScheduledAppointments, setAllScheduledAppointments] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  const refreshScheduled = useCallback((list: any[]) => {
    setAllScheduledAppointments(
      list.filter((a) => a.status === 'scheduled').map((a) => ({ date: a.date, time: a.time }))
    );
  }, []);

  const bookAppointment = async (data: {
    clientUid: string;
    clientName: string;
    treatmentName: string;
    date: string;
    time: string;
  }) => {
    const row = {
      id: crypto.randomUUID(),
      ...data,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    setAppointments((prev) => {
      const next = [...prev, row];
      refreshScheduled(next);
      return next;
    });
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    setAppointments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status } : a));
      refreshScheduled(next);
      return next;
    });
  };

  const placeOrder = async (data: {
    clientUid: string;
    clientName: string;
    items: unknown[];
    totalPrice: number;
  }) => {
    setOrders((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const addBlogPost = async (data: { title: string; content: string; author: string }) => {
    setBlogPosts((prev) => [
      { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const deleteBlogPost = async (id: string) => {
    setBlogPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const addReview = async (data: {
    treatmentId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
  }) => {
    setReviews((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...data,
        status: 'approved',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateReviewStatus = async (id: string, status: string) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const deleteReview = async (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const addTreatment = async (data: { name: string; description: string; price: string }) => {
    setTreatments((prev) => [...prev, { id: crypto.randomUUID(), ...data }]);
  };

  const deleteTreatment = async (id: string) => {
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  };

  const userAppointments = userId
    ? appointments.filter((a) => a.clientUid === userId)
    : [];
  const userOrders = userId ? orders.filter((o) => o.clientUid === userId) : [];

  return {
    products,
    appointments: userAppointments,
    allScheduledAppointments,
    blogPosts,
    orders: userOrders,
    reviews,
    treatments,
    bookAppointment,
    updateAppointmentStatus,
    placeOrder,
    updateOrderStatus,
    addBlogPost,
    deleteBlogPost,
    addReview,
    updateReviewStatus,
    deleteReview,
    addTreatment,
    deleteTreatment,
  };
}
