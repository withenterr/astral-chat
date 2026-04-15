import { supabase } from "./supabaseClient.js";

// Convert username to internal email format for Supabase
function usernameToEmail(username) {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  console.log('Converting username to email:', username, '->', `${cleanUsername}@example.com`);
  return `${cleanUsername}@example.com`;
}

// Extract username from internal email format
function emailToUsername(email) {
  if (email.endsWith('@example.com')) {
    return email.split('@')[0];
  }
  return email;
}

export async function signUp(username, password) {
  const email = usernameToEmail(username);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        display_name: username
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    data.user.username = username;
  }

  return data;
}

export async function signIn(username, password) {
  const email = usernameToEmail(username);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    data.user.username = username;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Signout error:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error);
      throw error;
    }

    // Extract username from user metadata or email
    if (data.user) {
      data.user.username = data.user.user_metadata?.username || 
                          data.user.user_metadata?.display_name || 
                          emailToUsername(data.user.email);
    }

    return data.user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error);
      throw error;
    }

    // Extract username from session user
    if (data.session?.user) {
      data.session.user.username = data.session.user.user_metadata?.username || 
                                  data.session.user.user_metadata?.display_name || 
                                  emailToUsername(data.session.user.email);
    }

    console.log('Current session retrieved:', data.session ? 'Active' : 'None');
    return data.session;
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    // Extract username from session user if available
    if (session?.user) {
      session.user.username = session.user.user_metadata?.username || 
                             session.user.user_metadata?.display_name || 
                             emailToUsername(session.user.email);
    }
    callback(event, session);
  });
}
