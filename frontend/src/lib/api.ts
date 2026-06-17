/**
 * Utility to communicate with the FastAPI backend.
 * The backend is responsible for Supabase interactions.
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export type ChatTurn = {
  role: "user" | "model";
  parts: { text: string }[];
};

export async function sendChatToBackend(messages: ChatTurn[]) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = "שגיאה בשרת הצ׳אט";
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === "string" ? errorData.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

export async function addSupabaseData(name: string, content: string) {
  try {
    const response = await fetch(`${API_URL}/add_data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || "Failed to add data to Supabase via Backend",
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// 3. שליפת כל התורים הקיימים
export async function fetchAppointments() {
  const response = await fetch(`${BACKEND_URL}/api/appointments`);
  if (!response.ok) {
    throw new Error("שגיאה בשליפת התורים");
  }
  return response.json();
}
// 4. עדכון סטטוס של תור (למשל: ביטול תור)
export async function updateAppointmentStatusInDB(id: string, status: string) {
  const response = await fetch(`${BACKEND_URL}/api/appointments/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "שגיאה בעדכון התור");
  }

  return response.json();
}
// 1. שליפת חלונות זמן פנויים עבור תאריך ספציפי
export async function fetchAvailableSlots(date: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/appointments/available-slots?date=${date}`,
    );
    if (!response.ok) {
      throw new Error("שגיאה בשליפת השעות הפנויות");
    }
    const data = await response.json();
    return data.available_slots;
  } catch (error) {
    console.error("Error fetching slots:", error);
    throw error;
  }
}

// 2. שמירת תור חדש בבסיס הנתונים
export async function createAppointment(appointmentData: {
  client_name: string;
  phone: string;
  treatment_type: string;
  appointment_date: string;
  appointment_time: string;
}) {
  const response = await fetch(`${BACKEND_URL}/api/appointments/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(appointmentData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "חלה שגיאה במהלך קביעת התור");
  }

  return response.json();
}
