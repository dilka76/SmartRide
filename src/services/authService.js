import { supabase } from "./supabaseClient.js";

async function syncProfile(user, fullName, phone) {
  if (!user?.id) {
    return;
  }

  const fallbackName =
    fullName ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  // Best-effort profile sync for authenticated sessions.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fallbackName,
    phone: phone ?? user.user_metadata?.phone ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function signUp(email, password, fullName, phone) {
  // Create auth user first, then mirror the identity in public.profiles.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  });

  if (error) {
    throw error;
  }

  const user = data?.user;

  if (!user?.id) {
    throw new Error("Sign-up succeeded but no user was returned.");
  }

  // If email confirmation is enabled, there might be no active session yet.
  // In that case the DB trigger on auth.users creates the profile row.
  if (data.session) {
    await syncProfile(user, fullName, phone);
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  await syncProfile(data.user, null, null);

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  // Session comes from Supabase Auth; profile data lives in our app table.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const user = session?.user ?? null;

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return { user, profile: profile ?? null };
}

export async function updateCurrentUserProfile(updates = {}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Трябва да сте влезли в профила си.");
  }

  const fullName = typeof updates.full_name === "string" ? updates.full_name.trim() : "";
  const phone = typeof updates.phone === "string" ? updates.phone.trim() : "";
  const avatarUrl = typeof updates.avatar_url === "string" ? updates.avatar_url.trim() : "";

  if (!fullName) {
    throw new Error("Името е задължително.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id)
    .select("id, full_name, phone, avatar_url, role, created_at")
    .single();

  if (error) {
    throw error;
  }

  await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone: phone || null,
    },
  });

  return data;
}