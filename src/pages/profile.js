import { getCurrentUser } from "../services/authService.js";
import {
  adminModerateTrip,
  getAllTrips,
  getDriverTripsWithBookings,
  getUserBookings,
  updateBookingStatus,
} from "../services/tripService.js";

function statusBadge(status) {
  if (status === "approved") {
    return '<span class="badge bg-success">Approved</span>';
  }

  if (status === "rejected") {
    return '<span class="badge bg-danger">Rejected</span>';
  }

  return '<span class="badge bg-warning text-dark">Pending</span>';
}

function tripModerationBadge(status) {
  if (status === "approved") {
    return '<span class="badge bg-success">Approved</span>';
  }

  if (status === "rejected") {
    return '<span class="badge bg-danger">Rejected</span>';
  }

  return '<span class="badge bg-warning text-dark">Pending</span>';
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function profileInfoSection(user, profile) {
  return `
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <h2 class="h5 mb-3">Profile Information</h2>
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <div class="small text-muted">Full Name</div>
            <div class="fw-semibold">${profile?.full_name || "Not set"}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="small text-muted">Email</div>
            <div class="fw-semibold">${user.email || "Not available"}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="small text-muted">Phone</div>
            <div class="fw-semibold">${profile?.phone || "Not set"}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function passengerBookingsSection(bookings) {
  if (!bookings.length) {
    return `
      <div class="alert alert-secondary mb-0" role="alert">
        No bookings yet.
      </div>
    `;
  }

  const rows = bookings
    .map((booking) => {
      const trip = booking.trip;
      const driverName = trip?.driver?.full_name || "Unknown";
      const driverPhone = trip?.driver?.phone || "Not shared";

      return `
        <tr>
          <td>${trip?.from_city || "-"} → ${trip?.to_city || "-"}</td>
          <td>${formatDateTime(trip?.date_time)}</td>
          <td>${driverName}</td>
          <td>${driverPhone}</td>
          <td>${booking.seats_requested || 1}</td>
          <td>${statusBadge(booking.status)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date</th>
            <th>Driver</th>
            <th>Driver Phone</th>
            <th>Seats</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function driverTripsSection(trips, currentUserId) {
  if (!trips.length) {
    return `
      <div class="alert alert-secondary mb-0" role="alert">
        You have not created trips yet.
      </div>
    `;
  }

  return trips
    .map((trip) => {
      const bookingRows = (trip.bookings || [])
        .map((booking) => {
          const passengerName = booking.passenger?.full_name || "Unknown";
          const passengerPhone = booking.passenger?.phone || "Not shared";
          const canManageRequest = trip.driver_id === currentUserId;
          const actions =
            booking.status === "pending" && canManageRequest
              ? `
                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm btn-success"
                    type="button"
                    data-booking-action="approved"
                    data-booking-id="${booking.id}"
                    data-trip-id="${trip.id}"
                    data-driver-id="${trip.driver_id}"
                  >Accept</button>
                  <button
                    class="btn btn-sm btn-danger"
                    type="button"
                    data-booking-action="rejected"
                    data-booking-id="${booking.id}"
                    data-trip-id="${trip.id}"
                    data-driver-id="${trip.driver_id}"
                  >Reject</button>
                </div>
              `
              : "-";

          return `
            <tr>
              <td>${passengerName}</td>
              <td>${passengerPhone}</td>
              <td>${booking.seats_requested || 1}</td>
              <td>${statusBadge(booking.status)}</td>
              <td>${actions}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <div>
                <h3 class="h6 mb-1">${trip.from_city} → ${trip.to_city}</h3>
                <p class="text-muted mb-0">${formatDateTime(trip.date_time)}</p>
                <div class="mt-2">${tripModerationBadge(trip.moderation_status)}</div>
              </div>
              <div class="text-end small text-muted">
                <div>Seats: ${trip.available_seats}</div>
                <div>Price: ${Number(trip.price).toFixed(2)} EUR</div>
              </div>
            </div>

            ${
              trip.moderation_status === "pending"
                ? '<div class="alert alert-warning py-2 mb-3">This trip is pending administrator approval.</div>'
                : ""
            }
            ${
              trip.moderation_status === "rejected"
                ? '<div class="alert alert-danger py-2 mb-3">This trip was rejected by an administrator.</div>'
                : ""
            }

            ${
              bookingRows
                ? `
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Passenger</th>
                      <th>Phone</th>
                      <th>Seats</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>${bookingRows}</tbody>
                </table>
              </div>
            `
                : '<div class="alert alert-light mb-0">No booking requests for this trip yet.</div>'
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function showInlineAlert(hostId, message, type = "danger") {
  const host = document.getElementById(hostId);

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type} mb-0" role="alert">${message}</div>`;
}

function showToast(message) {
  const toastContainer = document.getElementById("profileToastContainer");

  if (!toastContainer) {
    return;
  }

  const toastId = `toast-${Date.now()}`;
  toastContainer.insertAdjacentHTML(
    "beforeend",
    `
      <div id="${toastId}" class="toast align-items-center text-bg-success border-0" role="status" aria-live="polite" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
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

function adminPendingTripsSection(trips) {
  if (!trips.length) {
    return '<div class="alert alert-secondary mb-0">No pending trips waiting for approval.</div>';
  }

  const rows = trips
    .map(
      (trip) => `
        <tr>
          <td>${trip.from_city} → ${trip.to_city}</td>
          <td>${formatDateTime(trip.date_time)}</td>
          <td>${trip.driver?.full_name || "Unknown"}</td>
          <td>${Number(trip.price).toFixed(2)} EUR</td>
          <td>${trip.available_seats}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" type="button" data-admin-trip-action="approved" data-trip-id="${trip.id}">Approve</button>
              <button class="btn btn-sm btn-danger" type="button" data-admin-trip-action="rejected" data-trip-id="${trip.id}">Reject</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date</th>
            <th>Driver</th>
            <th>Price</th>
            <th>Seats</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function renderProfileContent(user, profile) {
  const profileInfoHost = document.getElementById("profileInfoContent");
  const passengerHost = document.getElementById("passengerBookingsContent");
  const driverHost = document.getElementById("driverTripsContent");
  const adminTripsSection = document.getElementById("adminTripModerationSection");
  const adminTripsHost = document.getElementById("adminTripModerationContent");

  if (!profileInfoHost || !passengerHost || !driverHost) {
    return;
  }

  profileInfoHost.innerHTML = profileInfoSection(user, profile);
  passengerHost.innerHTML = '<div class="text-muted">Loading bookings...</div>';
  driverHost.innerHTML = '<div class="text-muted">Loading trips...</div>';
  if (adminTripsHost) {
    adminTripsHost.innerHTML = '<div class="text-muted">Loading pending trips...</div>';
  }

  try {
    const [bookings, driverTrips] = await Promise.all([
      getUserBookings(user.id),
      getDriverTripsWithBookings(user.id),
    ]);

    passengerHost.innerHTML = passengerBookingsSection(bookings);
    driverHost.innerHTML = driverTripsSection(driverTrips, user.id);

    if (profile?.role === "admin" && adminTripsSection && adminTripsHost) {
      adminTripsSection.classList.remove("d-none");
      const allTrips = await getAllTrips({}, { includeAll: true });
      const pendingTrips = allTrips.filter((trip) => trip.moderation_status === "pending");
      adminTripsHost.innerHTML = adminPendingTripsSection(pendingTrips);
    } else if (adminTripsSection && adminTripsHost) {
      adminTripsSection.classList.add("d-none");
      adminTripsHost.innerHTML = "";
    }
  } catch (error) {
    showInlineAlert("passengerBookingsContent", error.message || "Failed to load bookings.");
    showInlineAlert("driverTripsContent", error.message || "Failed to load trips.");
    if (profile?.role === "admin") {
      showInlineAlert("adminTripModerationContent", error.message || "Failed to load pending trips.");
    }
  }
}

function bindDriverActions(user, profile) {
  const driverHost = document.getElementById("driverTripsContent");

  if (!driverHost) {
    return;
  }

  driverHost.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.getAttribute("data-booking-action");
    const bookingId = target.getAttribute("data-booking-id");
    const tripId = target.getAttribute("data-trip-id");
    const driverId = target.getAttribute("data-driver-id");

    if (!action || !bookingId || !tripId) {
      return;
    }

    if (driverId !== user.id) {
      showInlineAlert("driverTripsContent", "You are not allowed to manage this booking.");
      return;
    }

    target.setAttribute("disabled", "true");

    try {
      await updateBookingStatus(bookingId, tripId, action);
      showToast(`Booking ${action} successfully.`);
      await renderProfileContent(user, profile);
    } catch (error) {
      showInlineAlert("driverTripsContent", error.message || "Unable to update booking status.");
    } finally {
      target.removeAttribute("disabled");
    }
  });
}

function bindAdminTripModerationActions(user, profile) {
  const adminTripsHost = document.getElementById("adminTripModerationContent");

  if (!adminTripsHost || profile?.role !== "admin") {
    return;
  }

  adminTripsHost.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("[data-admin-trip-action]");

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const action = button.getAttribute("data-admin-trip-action");
    const tripId = button.getAttribute("data-trip-id");

    if (!tripId || (action !== "approved" && action !== "rejected")) {
      return;
    }

    button.disabled = true;

    try {
      await adminModerateTrip(tripId, action);
      showToast(`Trip ${action} successfully.`);
      await renderProfileContent(user, profile);
    } catch (error) {
      showInlineAlert("adminTripModerationContent", error.message || "Unable to moderate trip.");
      button.disabled = false;
    }
  });
}

export function ProfilePage() {
  return `
    <main class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 fw-semibold mb-1">My Profile</h1>
          <p class="text-muted mb-0">Manage your account and booking requests.</p>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3" id="profileTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab" aria-controls="info-pane" aria-selected="true">Profile Info</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="bookings-tab" data-bs-toggle="tab" data-bs-target="#bookings-pane" type="button" role="tab" aria-controls="bookings-pane" aria-selected="false">My Bookings</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="driver-tab" data-bs-toggle="tab" data-bs-target="#driver-pane" type="button" role="tab" aria-controls="driver-pane" aria-selected="false">My Trips & Requests</button>
        </li>
      </ul>

      <div class="tab-content">
        <div class="tab-pane fade show active" id="info-pane" role="tabpanel" aria-labelledby="info-tab" tabindex="0">
          <div id="profileInfoContent"></div>
        </div>
        <div class="tab-pane fade" id="bookings-pane" role="tabpanel" aria-labelledby="bookings-tab" tabindex="0">
          <div class="card border-0 shadow-sm">
            <div class="card-body" id="passengerBookingsContent"></div>
          </div>
        </div>
        <div class="tab-pane fade" id="driver-pane" role="tabpanel" aria-labelledby="driver-tab" tabindex="0">
          <div id="driverTripsContent"></div>
        </div>
      </div>

      <section id="adminTripModerationSection" class="card border-0 shadow-sm mt-4 d-none">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Pending Trip Approvals</h2>
            <span class="small text-muted">Administrator moderation queue</span>
          </div>
          <div id="adminTripModerationContent"></div>
        </div>
      </section>

      <div class="toast-container position-fixed bottom-0 end-0 p-3" id="profileToastContainer"></div>
    </main>
  `;
}

export async function setupProfilePage() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  await renderProfileContent(user, profile);
  bindDriverActions(user, profile);
  bindAdminTripModerationActions(user, profile);
}