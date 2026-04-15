import { supabase } from "./supabaseClient.js";

export async function sendMessage(username, message) {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ username, message }])
    .select()
    .single();

  if (error) {
    console.error("sendMessage error:", error);
    throw error;
  }

  return data;
}

export async function getMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMessages error:", error);
    throw error;
  }

  return data;
}

export function subscribeToMessages(onInsert) {
  return supabase
    .channel("messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        console.log("New realtime message:", payload.new);

        if (typeof onInsert === "function") {
          onInsert(payload.new, payload);
        }
      },
    )
    .subscribe();
}
