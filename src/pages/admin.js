import { getCurrentUser } from "../services/authService.js";
import { adminDeleteTrip, getAllProfiles, getAllTrips } from "../services/tripService.js";

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

  if (!trips.length) {
    host.innerHTML = '<div class="alert alert-light mb-0">No active trips found.</div>';
    return;
  }

  const rows = trips
    .map(
      (trip) => `
        <tr>
          <td>${escapeHtml(trip.from_city)} → ${escapeHtml(trip.to_city)}</td>
          <td>${formatDateTime(trip.date_time)}</td>
          <td>${Number(trip.price).toFixed(2)} BGN</td>
          <td>${trip.available_seats}</td>
          <td>${escapeHtml(trip.driver?.full_name || "Unknown")}</td>
          <td>
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

  const [profiles, trips] = await Promise.all([getAllProfiles(), getAllTrips()]);
  renderUsersTable(profiles);
  renderTripsTable(trips);
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

    const button = target.closest("[data-delete-trip-id]");

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const tripId = button.getAttribute("data-delete-trip-id");

    if (!tripId) {
      return;
    }

    const shouldDelete = window.confirm("Are you sure you want to delete this trip?");

    if (!shouldDelete) {
      return;
    }

    button.disabled = true;

    try {
      await adminDeleteTrip(tripId);
      await loadAdminData();
      showToast("Trip deleted successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete trip.", "danger");
      button.disabled = false;
    }
  });
}

export function AdminPage() {
  return `
    <main class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 fw-semibold mb-1">Admin Panel</h1>
          <p class="text-muted mb-0">Manage users and active platform trips.</p>
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
            <h2 class="h5 mb-3">All Active Trips</h2>
            <div id="adminTripsTableHost"></div>
          </div>
        </section>
      </div>

      <div class="toast-container position-fixed bottom-0 end-0 p-3" id="adminToastContainer"></div>
    </main>
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
  } catch (error) {
    showAccessDenied(error.message || "Unable to load admin data.");
  }
}