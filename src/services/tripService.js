import { supabase } from "./supabaseClient.js";

const CAR_PHOTOS_BUCKET = "car-photos";

async function requireUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const user = session?.user;

  if (!user) {
    throw new Error("You must be logged in to perform this action.");
  }

  return user;
}

export async function uploadCarPhoto(file) {
  if (!file) {
    return null;
  }

  const user = await requireUser();
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
  const safeExtension = extension || "jpg";
  const fileName = `${crypto.randomUUID()}.${safeExtension}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(CAR_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(CAR_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createTrip(tripData) {
  const user = await requireUser();

  const payload = {
    driver_id: user.id,
    from_city: tripData.from_city,
    to_city: tripData.to_city,
    date_time: tripData.date_time,
    price: Number(tripData.price),
    available_seats: Number(tripData.available_seats),
    car_photo_url: tripData.car_photo_url || null,
  };

  const { data, error } = await supabase.from("trips").insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAllTrips(filters = {}) {
  let query = supabase
    .from("trips")
    .select(
      "id, from_city, to_city, date_time, price, available_seats, car_photo_url, driver:profiles!trips_driver_id_fkey(full_name)"
    )
    .gt("available_seats", 0)
    .gte("date_time", new Date().toISOString())
    .order("date_time", { ascending: true });

  if (filters.from_city) {
    query = query.ilike("from_city", `%${filters.from_city}%`);
  }

  if (filters.to_city) {
    query = query.ilike("to_city", `%${filters.to_city}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getTripById(tripId) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, driver_id, from_city, to_city, date_time, price, available_seats, car_photo_url, driver:profiles!trips_driver_id_fkey(full_name, phone, avatar_url)"
    )
    .eq("id", tripId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function bookSeat(tripId, passengerId) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const user = await requireUser();
  const effectivePassengerId = passengerId || user.id;

  if (effectivePassengerId !== user.id) {
    throw new Error("You can only create bookings for your own account.");
  }

  const trip = await getTripById(tripId);

  if (trip.driver_id === effectivePassengerId) {
    throw new Error("You cannot book a seat on your own trip.");
  }

  if (trip.available_seats <= 0) {
    throw new Error("No available seats for this trip.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      trip_id: tripId,
      passenger_id: effectivePassengerId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already requested a booking for this trip.");
    }

    throw error;
  }

  return data;
}