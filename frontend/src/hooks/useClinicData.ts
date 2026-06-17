import { useState, useCallback, useEffect } from "react";
import { fetchAppointments, updateAppointmentStatusInDB } from "../lib/api";

export function useClinicData(userId: string | undefined) {
  const [products, setProducts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [allScheduledAppointments, setAllScheduledAppointments] = useState<
    any[]
  >([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  // הפונקציה החדשה ששואבת נתונים מהשרת (Supabase)
  const loadAppointments = useCallback(async () => {
    try {
      const data = await fetchAppointments();

      // התאמת שמות השדות ממסד הנתונים למבנה שהפרונטאנד מצפה לו
      const mapped = data.map((item: any) => ({
        id: item.id.toString(),
        clientName: item.client_name,
        treatmentName: item.treatment_type,
        date: item.appointment_date,
        time: item.appointment_time,
        status: item.status === "confirmed" ? "scheduled" : item.status,
      }));

      setAppointments(mapped);

      // עדכון מערך השעות התפוסות (לטובת לוח השנה)
      setAllScheduledAppointments(
        mapped
          .filter((a: any) => a.status === "scheduled")
          .map((a: any) => ({ date: a.date, time: a.time })),
      );
    } catch (error) {
      console.error("Error loading appointments:", error);
    }
  }, []);

  // טעינת הנתונים אוטומטית כשהאפליקציה עולה
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ==========================================
  // שאר הפונקציות נשארות כמו שהן כדי לא לשבור את האפליקציה
  // ==========================================

  const refreshScheduled = useCallback((list: any[]) => {
    setAllScheduledAppointments(
      list
        .filter((a) => a.status === "scheduled")
        .map((a) => ({ date: a.date, time: a.time })),
    );
  }, []);

  const bookAppointment = async (data: any) => {
    /* מנוהל כעת ישירות ב-BookingPage */
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      // הפרונטאנד שולח 'cancelled' עם דאבל L, אבל סאפבייס שלנו שומר 'canceled' או 'confirmed'
      const dbStatus = status === "cancelled" ? "canceled" : status;

      // נשלח את הבקשה לשרת לעדכן את מסד הנתונים
      await updateAppointmentStatusInDB(id, dbStatus);

      // ברגע שהשרת אישר, נרענן את כל התורים מהמסד כדי שהתצוגה תתעדכן מיד
      await loadAppointments();
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  const placeOrder = async (data: any) => {
    setOrders((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...data,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const addBlogPost = async (data: any) => {
    setBlogPosts((prev) => [
      { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const deleteBlogPost = async (id: string) => {
    setBlogPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const addReview = async (data: any) => {
    setReviews((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...data,
        status: "approved",
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

  const addTreatment = async (data: any) => {
    setTreatments((prev) => [...prev, { id: crypto.randomUUID(), ...data }]);
  };

  const deleteTreatment = async (id: string) => {
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  };

  const userOrders = userId ? orders.filter((o) => o.clientUid === userId) : [];

  return {
    products,
    appointments, // מחזירים את התורים האמיתיים מהשרת!
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
    refreshData: loadAppointments, // חשיפת פונקציית הרענון החוצה
  };
}
