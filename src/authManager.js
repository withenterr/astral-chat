// Hybrid Guest/Permanent Authentication System

// Guest account management
const GUEST_SESSION_KEY = 'astral-chat-guest-session';
const GUEST_SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Generate unique guest username
function generateGuestUsername() {
  const randomId = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `Guest_${randomId}`;
}

// Create guest session
function createGuestSession() {
  const guestData = {
    username: generateGuestUsername(),
    isGuest: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + GUEST_SESSION_DURATION
  };
  
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestData));
  return guestData;
}

// Get current guest session
function getGuestSession() {
  try {
    const sessionData = localStorage.getItem(GUEST_SESSION_KEY);
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting guest session:', error);
    return null;
  }
}

// Check if guest session is expired
function isGuestSessionExpired(session) {
  return Date.now() > session.expiresAt;
}

// Clear guest session
function clearGuestSession() {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

// Auto-login as guest
export async function autoLoginAsGuest() {
  console.log('Creating guest session...');
  
  // Clear any existing expired guest session
  const existingSession = getGuestSession();
  if (existingSession && isGuestSessionExpired(existingSession)) {
    clearGuestSession();
  }
  
  // Return existing valid session or create new one
  const guestSession = getGuestSession() || createGuestSession();
  
  return {
    user: {
      id: `guest_${guestSession.username}`,
      username: guestSession.username,
      isGuest: true
    },
    session: guestSession
  };
}

// Upgrade guest to permanent account
export async function upgradeToPermanentAccount(username, email, password) {
  try {
    // Import Supabase client (only needed for upgrade)
    const { supabase } = await import('./supabaseClient.js');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username,
          upgraded_from_guest_id: getGuestSession()?.username,
          upgraded_at: new Date().toISOString()
        }
      }
    });

    if (error) {
      throw new Error(`Failed to create permanent account: ${error.message}`);
    }

    // Clear guest session after successful upgrade
    clearGuestSession();
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Upgrade error:', error);
    throw error;
  }
}

// Get current user (guest or permanent)
export async function getCurrentUser() {
  // First check for valid guest session
  const guestSession = getGuestSession();
  if (guestSession && !isGuestSessionExpired(guestSession)) {
    console.log('Using guest session:', guestSession.username);
    return {
      user: {
        id: `guest_${guestSession.username}`,
        username: guestSession.username,
        isGuest: true
      },
      session: guestSession
    };
  }
  
  // If no valid guest session, try Supabase
  try {
    const { getCurrentSession } = await import('./auth.js');
    const supabaseSession = await getCurrentSession();
    
    if (supabaseSession?.user) {
      console.log('Using Supabase session:', supabaseSession.user.username);
      return {
        user: supabaseSession.user,
        session: supabaseSession
      };
    }
  } catch (error) {
    console.error('Error checking Supabase session:', error);
  }
  
  // No valid session found
  return null;
}

// Sign out (clears both guest and permanent sessions)
export async function signOut() {
  clearGuestSession();
  
  try {
    const { signOut: supabaseSignOut } = await import('./auth.js');
    await supabaseSignOut();
  } catch (error) {
    console.error('Error signing out from Supabase:', error);
  }
}
