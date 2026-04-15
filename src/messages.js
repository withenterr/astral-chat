import { supabase } from "./supabaseClient.js";

export async function sendMessage(username, message) {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ username, message }])
    .select()
    .single();

  if (error) {
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
    throw error;
  }

  return data;
}
