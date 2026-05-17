/**
 * Utility to communicate with the FastAPI backend.
 * The backend is responsible for Supabase interactions.
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export type ChatTurn = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export async function sendChatToBackend(messages: ChatTurn[]) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = 'שגיאה בשרת הצ׳אט';
    try {
      const errorData = await response.json();
      detail = typeof errorData.detail === 'string' ? errorData.detail : detail;
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add data to Supabase via Backend');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
