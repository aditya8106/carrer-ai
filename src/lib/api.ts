import { supabase } from "@/integrations/supabase/client";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const buildUrl = (path: string) => {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not configured.");
  }
  return `${API_URL}${path}`;
};

const getAuthHeaders = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to continue.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: "Bearer ".concat(session.access_token),
  };
};

export const apiPost = async <TBody, TResponse>(path: string, body: TBody): Promise<TResponse> => {
  const headers = await getAuthHeaders();
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data as TResponse;
};

export const apiStreamPost = async <TBody>(path: string, body: TBody): Promise<Response> => {
  const headers = await getAuthHeaders();
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to connect");
  }

  return response;
};
