import { supabase } from "./supabaseClient.js";

const CAR_PHOTOS_BUCKET = "car-photos";

export async function uploadCarPhoto(file, userId) {
  if (!file) {
    throw new Error("Please select a file.");
  }

  if (!userId) {
    throw new Error("You must be logged in to upload car photos.");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg";
  const safeExtension = extension || "jpg";
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

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

  return {
    filePath,
    publicUrl: data.publicUrl,
  };
}