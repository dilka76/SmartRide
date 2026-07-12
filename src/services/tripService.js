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
    moderation_status: "pending",
  };

  const { data, error } = await supabase.from("trips").insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAllTrips(filters = {}, options = {}) {
  const includeAll = options.includeAll === true;

  let query = supabase
    .from("trips")
    .select(
      "id, from_city, to_city, date_time, price, available_seats, moderation_status, car_photo_url, driver:profiles!trips_driver_id_fkey(full_name)"
    )
    .order("date_time", { ascending: true });

  if (!includeAll) {
    query = query.eq("moderation_status", "approved").gt("available_seats", 0).gte("date_time", new Date().toISOString());
  }

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

export async function getAllPendingTrips() {
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, from_city, to_city, date_time, price, available_seats, moderation_status, driver_id, driver:profiles!trips_driver_id_fkey(full_name, phone)"
    )
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: false });

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
      "id, driver_id, from_city, to_city, date_time, price, available_seats, moderation_status, car_photo_url, driver:profiles!trips_driver_id_fkey(full_name, phone, avatar_url)"
    )
    .eq("id", tripId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function bookSeat(tripId, passengerId, seatsRequested = 1, bookingDetails = {}) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const user = await requireUser();
  const effectivePassengerId = passengerId || user.id;
  const requestedSeats = Number(seatsRequested);
  const passengerPhone = typeof bookingDetails.passengerPhone === "string" ? bookingDetails.passengerPhone.trim() : "";
  const passengerNoteRaw = typeof bookingDetails.passengerNote === "string" ? bookingDetails.passengerNote : "";
  const passengerNote = passengerNoteRaw.trim();

  if (!Number.isInteger(requestedSeats) || requestedSeats < 1) {
    throw new Error("Requested seats must be at least 1.");
  }

  if (!passengerPhone) {
    throw new Error("Phone number is required.");
  }

  if (effectivePassengerId !== user.id) {
    throw new Error("You can only create bookings for your own account.");
  }

  const trip = await getTripById(tripId);

  if (trip.driver_id === effectivePassengerId) {
    throw new Error("You cannot book a seat on your own trip.");
  }

  if (trip.available_seats < requestedSeats) {
    throw new Error("Not enough available seats for this request.");
  }

  const baseBookingPayload = {
    trip_id: tripId,
    passenger_id: effectivePassengerId,
    status: "pending",
    seats_requested: requestedSeats,
  };

  const enhancedBookingPayload = {
    ...baseBookingPayload,
    passenger_phone: passengerPhone,
    passenger_note: passengerNote || null,
  };

  let { data, error } = await supabase
    .from("bookings")
    .insert(enhancedBookingPayload)
    .select()
    .single();

  const isMissingColumnError =
    error &&
    (error.code === "42703" ||
      error.code === "PGRST204" ||
      /column .* does not exist/i.test(error.message || "") ||
      /schema cache/i.test(error.message || "") ||
      /could not find .* column/i.test(error.message || ""));

  if (isMissingColumnError) {
    ({ data, error } = await supabase.from("bookings").insert(baseBookingPayload).select().single());
  }

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already requested a booking for this trip.");
    }

    throw error;
  }

  return data;
}

export async function getUserBookings(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, trip_id, status, seats_requested, created_at, trip:trips!bookings_trip_id_fkey(id, from_city, to_city, date_time, driver:profiles!trips_driver_id_fkey(full_name, phone))"
    )
    .eq("passenger_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getDriverTripsWithBookings(driverId) {
  if (!driverId) {
    throw new Error("Driver ID is required.");
  }

  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, driver_id, from_city, to_city, date_time, available_seats, price, moderation_status, bookings:bookings!bookings_trip_id_fkey(id, trip_id, passenger_id, status, seats_requested, created_at, passenger:profiles!bookings_passenger_id_fkey(full_name, phone))"
    )
    .eq("driver_id", driverId)
    .order("date_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getDriverTrips(driverId) {
  if (!driverId) {
    throw new Error("Driver ID is required.");
  }

  const { data, error } = await supabase
    .from("trips")
    .select("id, driver_id, from_city, to_city, date_time, moderation_status")
    .eq("driver_id", driverId)
    .order("date_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getAllPendingBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, trip_id, passenger_id, status, seats_requested, created_at, trip:trips!bookings_trip_id_fkey(id, from_city, to_city, date_time, driver:profiles!trips_driver_id_fkey(full_name)), passenger:profiles!bookings_passenger_id_fkey(full_name, phone)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getAllAdminBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, trip_id, passenger_id, status, seats_requested, created_at, trip:trips!bookings_trip_id_fkey(id, from_city, to_city, date_time, driver:profiles!trips_driver_id_fkey(full_name)), passenger:profiles!bookings_passenger_id_fkey(full_name, phone)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateBookingStatus(bookingId, tripId, newStatus) {
  if (!bookingId || !tripId) {
    throw new Error("Booking ID and Trip ID are required.");
  }

  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new Error("Invalid booking status.");
  }

  const { error } = await supabase.rpc("update_booking_status_and_adjust_seats", {
    p_booking_id: bookingId,
    p_trip_id: tripId,
    p_new_status: newStatus,
  });

  if (error) {
    throw error;
  }
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateUserRole(userId, role) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (role !== "user" && role !== "admin") {
    throw new Error("Invalid role.");
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    throw error;
  }
}

export async function adminDeleteTrip(tripId) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const { error } = await supabase.from("trips").delete().eq("id", tripId);

  if (error) {
    throw error;
  }
}

export async function adminUpdateTrip(tripId, updates) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const payload = {
    from_city: updates.from_city,
    to_city: updates.to_city,
    date_time: updates.date_time,
    price: Number(updates.price),
    available_seats: Number(updates.available_seats),
  };

  if (Object.prototype.hasOwnProperty.call(updates, "car_photo_url")) {
    payload.car_photo_url = updates.car_photo_url;
  }

  const { error } = await supabase.from("trips").update(payload).eq("id", tripId);

  if (error) {
    throw error;
  }
}

export async function adminModerateTrip(tripId, status) {
  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  if (status !== "approved" && status !== "rejected") {
    throw new Error("Invalid trip moderation status.");
  }

  const { error } = await supabase.from("trips").update({ moderation_status: status }).eq("id", tripId);

  if (error) {
    throw error;
  }
}

export async function deleteBooking(bookingId) {
  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

  if (error) {
    throw error;
  }
}