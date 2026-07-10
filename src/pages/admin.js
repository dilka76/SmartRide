import { getCurrentUser } from "../services/authService.js";
import { adminDeleteTrip, adminUpdateTrip, getAllProfiles, getAllTrips, uploadCarPhoto } from "../services/tripService.js";

const tripById = new Map();
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80";

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDatetimeLocalValue(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function roleBadge(role) {
  if (role === "admin") {
    return '<span class="badge bg-dark">admin</span>';
  }

  return '<span class="badge bg-secondary">user</span>';
}

function showAccessDenied(message) {
  const host = document.getElementById("adminContent");

  if (!host) {
    return;
  }

  host.innerHTML = `
    <div class="alert alert-danger" role="alert">
      ${escapeHtml(message)} Redirecting to home page...
    </div>
  `;

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 2000);
}

function showToast(message, type = "success") {
  const container = document.getElementById("adminToastContainer");

  if (!container) {
    return;
  }

  const toastId = `admin-toast-${Date.now()}`;
  const styleClass = type === "success" ? "text-bg-success" : "text-bg-danger";

  container.insertAdjacentHTML(
    "beforeend",
    `
      <div id="${toastId}" class="toast align-items-center ${styleClass} border-0" role="status" aria-live="polite" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${escapeHtml(message)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `
  );

  const toastElement = document.getElementById(toastId);

  if (!toastElement) {
    return;
  }

  const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

function renderUsersTable(profiles) {
  const host = document.getElementById("adminUsersTableHost");

  if (!host) {
    return;
  }

  if (!profiles.length) {
    host.innerHTML = '<div class="alert alert-light mb-0">No profiles found.</div>';
    return;
  }

  const rows = profiles
    .map(
      (profile) => `
        <tr>
          <td>${escapeHtml(profile.full_name || "N/A")}</td>
          <td>${escapeHtml(profile.phone || "N/A")}</td>
          <td>${roleBadge(profile.role)}</td>
          <td>${formatDateTime(profile.created_at)}</td>
        </tr>
      `
    )
    .join("");

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped align-middle mb-0">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Account Created At</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTripsTable(trips) {
  const host = document.getElementById("adminTripsTableHost");

  if (!host) {
    return;
  }

  tripById.clear();

  if (!trips.length) {
    host.innerHTML = '<div class="alert alert-light mb-0">No trips found.</div>';
    return;
  }

  trips.forEach((trip) => {
    tripById.set(trip.id, trip);
  });

  const rows = trips
    .map(
      (trip) => `
        <tr>
          <td>${escapeHtml(trip.from_city)} → ${escapeHtml(trip.to_city)}</td>
          <td>${formatDateTime(trip.date_time)}</td>
          <td>${Number(trip.price).toFixed(2)} EUR</td>
          <td>${trip.available_seats}</td>
          <td>${escapeHtml(trip.driver?.full_name || "Unknown")}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-2" type="button" data-edit-trip-id="${trip.id}">
              <i class="bi bi-pencil-square"></i>
              Edit
            </button>
            <button class="btn btn-sm btn-danger" type="button" data-delete-trip-id="${trip.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0A.5.5 0 0 1 8.5 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1zm-3.5-1h-2v1h2zM4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4z"/>
              </svg>
              Delete Trip
            </button>
          </td>
        </tr>
      `
    )
    .join("");

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date & Time</th>
            <th>Price</th>
            <th>Seats</th>
            <th>Driver</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadAdminData() {
  const usersHost = document.getElementById("adminUsersTableHost");
  const tripsHost = document.getElementById("adminTripsTableHost");

  if (usersHost) {
    usersHost.innerHTML = '<div class="text-muted">Loading users...</div>';
  }

  if (tripsHost) {
    tripsHost.innerHTML = '<div class="text-muted">Loading trips...</div>';
  }

  const [profiles, trips] = await Promise.all([getAllProfiles(), getAllTrips({}, { includeAll: true })]);
  renderUsersTable(profiles);
  renderTripsTable(trips);
}

function openTripEditModal(tripId) {
  const trip = tripById.get(tripId);
  const modalElement = document.getElementById("editTripModal");
  const fromCityInput = document.getElementById("editFromCity");
  const toCityInput = document.getElementById("editToCity");
  const dateTimeInput = document.getElementById("editDateTime");
  const priceInput = document.getElementById("editPrice");
  const seatsInput = document.getElementById("editSeats");
  const imageInput = document.getElementById("editCarPhoto");
  const imagePreview = document.getElementById("editTripImagePreview");
  const tripIdInput = document.getElementById("editTripId");

  if (
    !trip ||
    !modalElement ||
    !fromCityInput ||
    !toCityInput ||
    !dateTimeInput ||
    !priceInput ||
    !seatsInput ||
    !imageInput ||
    !imagePreview ||
    !tripIdInput
  ) {
    return;
  }

  fromCityInput.value = trip.from_city;
  toCityInput.value = trip.to_city;
  dateTimeInput.value = toDatetimeLocalValue(trip.date_time);
  priceInput.value = String(trip.price);
  seatsInput.value = String(trip.available_seats);
  imageInput.value = "";
  imagePreview.src = trip.car_photo_url || PLACEHOLDER_IMAGE;
  tripIdInput.value = trip.id;

  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function bindEditTripForm() {
  const form = document.getElementById("editTripForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const tripId = String(formData.get("trip_id") || "");
    const dateTimeValue = String(formData.get("date_time") || "");
    const carPhotoFile = formData.get("car_photo");

    if (!tripId || !dateTimeValue) {
      showToast("Missing trip data for update.", "danger");
      return;
    }

    const parsedDate = new Date(dateTimeValue);

    if (Number.isNaN(parsedDate.getTime())) {
      showToast("Invalid date and time.", "danger");
      return;
    }

    const saveButton = document.getElementById("saveTripChangesButton");

    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = true;
    }

    try {
      const existingTrip = tripById.get(tripId);
      const carPhotoUrl =
        carPhotoFile instanceof File && carPhotoFile.size > 0
          ? await uploadCarPhoto(carPhotoFile)
          : (existingTrip?.car_photo_url ?? null);

      await adminUpdateTrip(tripId, {
        from_city: String(formData.get("from_city") || "").trim(),
        to_city: String(formData.get("to_city") || "").trim(),
        date_time: parsedDate.toISOString(),
        price: String(formData.get("price") || "0"),
        available_seats: String(formData.get("available_seats") || "0"),
        car_photo_url: carPhotoUrl,
      });

      const modalElement = document.getElementById("editTripModal");

      if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.hide();
      }

      await loadAdminData();
      showToast("Trip updated successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to update trip.", "danger");
    } finally {
      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = false;
      }
    }
  });
}

function bindAdminEvents() {
  const tripsHost = document.getElementById("adminTripsTableHost");

  if (!tripsHost) {
    return;
  }

  tripsHost.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const editButton = target.closest("[data-edit-trip-id]");

    if (editButton instanceof HTMLButtonElement) {
      const tripId = editButton.getAttribute("data-edit-trip-id");

      if (tripId) {
        openTripEditModal(tripId);
      }

      return;
    }

    const deleteButton = target.closest("[data-delete-trip-id]");

    if (!(deleteButton instanceof HTMLButtonElement)) {
      return;
    }

    const tripId = deleteButton.getAttribute("data-delete-trip-id");

    if (!tripId) {
      return;
    }

    const shouldDelete = window.confirm("Are you sure you want to delete this trip?");

    if (!shouldDelete) {
      return;
    }

    deleteButton.disabled = true;

    try {
      await adminDeleteTrip(tripId);
      await loadAdminData();
      showToast("Trip deleted successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete trip.", "danger");
      deleteButton.disabled = false;
    }
  });
}

export function AdminPage() {
  return `
    <main class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 fw-semibold mb-1">Admin Panel</h1>
          <p class="text-muted mb-0">Manage users and all platform trips.</p>
        </div>
      </div>

      <div id="adminContent">
        <section class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <h2 class="h5 mb-3">System Users</h2>
            <div id="adminUsersTableHost"></div>
          </div>
        </section>

        <section class="card border-0 shadow-sm">
          <div class="card-body">
            <h2 class="h5 mb-3">All Trips</h2>
            <div id="adminTripsTableHost"></div>
          </div>
        </section>
      </div>
    </main>

    <div class="toast-container position-fixed bottom-0 end-0 p-3" id="adminToastContainer"></div>

    <div class="modal fade" id="editTripModal" tabindex="-1" aria-labelledby="editTripModalTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title fs-5" id="editTripModalTitle">Edit Trip</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="editTripForm">
            <div class="modal-body">
              <input type="hidden" name="trip_id" id="editTripId" />
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label for="editFromCity" class="form-label">From City</label>
                  <input id="editFromCity" name="from_city" type="text" class="form-control" required />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editToCity" class="form-label">To City</label>
                  <input id="editToCity" name="to_city" type="text" class="form-control" required />
                </div>
                <div class="col-12">
                  <label for="editDateTime" class="form-label">Date & Time</label>
                  <input id="editDateTime" name="date_time" type="datetime-local" class="form-control" required />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editPrice" class="form-label">Price</label>
                  <input id="editPrice" name="price" type="number" class="form-control" min="0" step="0.01" required />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editSeats" class="form-label">Available Seats</label>
                  <input id="editSeats" name="available_seats" type="number" class="form-control" min="0" step="1" required />
                </div>
                <div class="col-12">
                  <label for="editCarPhoto" class="form-label">Vehicle Photo</label>
                  <input id="editCarPhoto" name="car_photo" class="form-control" type="file" accept="image/png,image/jpeg,image/webp" />
                  <div class="form-text">Leave empty to keep current image.</div>
                </div>
                <div class="col-12">
                  <img
                    id="editTripImagePreview"
                    src="${PLACEHOLDER_IMAGE}"
                    alt="Current trip vehicle"
                    class="img-fluid rounded-3 border"
                    style="max-height: 180px; object-fit: cover;"
                  />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary" id="saveTripChangesButton">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export async function setupAdminPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    showAccessDenied("You must be logged in to access the Admin Panel.");
    return;
  }

  if (profile?.role !== "admin") {
    showAccessDenied("Access denied. Admin role is required.");
    return;
  }

  try {
    await loadAdminData();
    bindAdminEvents();
    bindEditTripForm();
  } catch (error) {
    showAccessDenied(error.message || "Unable to load admin data.");
  }
}