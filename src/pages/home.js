import { getCurrentUser } from "../services/authService.js";
import {
  adminModerateTrip,
  deleteBooking,
  getAllAdminBookings,
  getAllPendingTrips,
  getAllTrips,
  getUserBookings,
  updateBookingContactDetails,
  updateBookingStatus,
} from "../services/tripService.js";
import { setAdminNotificationRefreshCallback } from "../services/notificationService.js";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";
let heroLottieInstance = null;
let lottieLoaderPromise = null;
const userBookingsById = new Map();
const adminBookingsById = new Map();

async function initHeroLottie() {
  const host = document.getElementById("heroLottie");

  if (!host) {
    return;
  }

  host.classList.remove("is-loaded");

  if (heroLottieInstance) {
    heroLottieInstance.destroy();
    heroLottieInstance = null;
  }

  try {
    if (!lottieLoaderPromise) {
      lottieLoaderPromise = import("lottie-web");
    }

    const { default: lottie } = await lottieLoaderPromise;

    if (!document.body.contains(host)) {
      return;
    }

    heroLottieInstance = lottie.loadAnimation({
      container: host,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/lottie/tourists-by-car.json",
    });

    heroLottieInstance.addEventListener("DOMLoaded", () => {
      if (document.body.contains(host)) {
        host.classList.add("is-loaded");
      }
    });
  } catch (error) {
    console.error("Failed to load hero animation:", error);
  }
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

function bookingStatusBadge(status) {
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

function renderUserBookings(bookings) {
  const host = document.getElementById("myBookingsHost");

  if (!host) {
    return;
  }

  userBookingsById.clear();

  if (!bookings.length) {
    host.innerHTML = '<div class="alert alert-secondary mb-0">You do not have active travel bookings yet.</div>';
    return;
  }

  const rows = bookings
    .map((booking) => {
      userBookingsById.set(booking.id, booking);
      const trip = booking.trip;
      return `
        <tr>
          <td>${trip?.from_city || "-"} → ${trip?.to_city || "-"}</td>
          <td>${formatDateTime(trip?.date_time)}</td>
          <td>${trip?.driver?.full_name || "Unknown"}</td>
          <td>${booking.passenger_phone || "N/A"}</td>
          <td>${booking.passenger_note || "-"}</td>
          <td>${booking.seats_requested || 1}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-2" type="button" data-edit-booking-id="${booking.id}" data-booking-source="user">
              Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-delete-booking-id="${booking.id}">
              <i class="bi bi-trash3"></i>
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date & Time</th>
            <th>Driver</th>
            <th>Phone</th>
            <th>Note</th>
            <th>Seats</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showBookingsError(message) {
  const host = document.getElementById("myBookingsHost");

  if (!host) {
    return;
  }

  host.innerHTML = `<div class="alert alert-danger mb-0">${message}</div>`;
}

function renderAdminPendingBookings(bookings) {
  const host = document.getElementById("adminPendingBookingsHost");

  adminBookingsById.clear();

  if (!host) {
    return;
  }

  if (!bookings.length) {
    host.innerHTML = '<div class="alert alert-secondary mb-0">No booking requests found.</div>';
    return;
  }

  const rows = bookings
    .map((booking) => {
      adminBookingsById.set(booking.id, booking);
      const trip = booking.trip;
      const passenger = booking.passenger;

      const actionButtons =
        booking.status === "pending"
          ? `
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" type="button" data-admin-booking-action="approved" data-booking-id="${booking.id}" data-trip-id="${booking.trip_id}">
                Approve
              </button>
              <button class="btn btn-sm btn-danger" type="button" data-admin-booking-action="rejected" data-booking-id="${booking.id}" data-trip-id="${booking.trip_id}">
                Reject
              </button>
            </div>
          `
          : "-";

      return `
        <tr>
          <td>${trip?.from_city || "-"} → ${trip?.to_city || "-"}</td>
          <td>${formatDateTime(trip?.date_time)}</td>
          <td>${passenger?.full_name || "Unknown"}</td>
          <td>${booking.passenger_phone || passenger?.phone || "N/A"}</td>
          <td>${booking.passenger_note || "-"}</td>
          <td>${booking.seats_requested || 1}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td>
            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-primary" type="button" data-edit-booking-id="${booking.id}" data-booking-source="admin">
                Edit
              </button>
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date & Time</th>
            <th>Passenger</th>
            <th>Phone</th>
            <th>Note</th>
            <th>Seats</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showAdminPendingBookingsError(message) {
  const host = document.getElementById("adminPendingBookingsHost");

  if (!host) {
    return;
  }

  host.innerHTML = `<div class="alert alert-danger mb-0">${message}</div>`;
}

function renderAdminPendingTrips(trips) {
  const host = document.getElementById("adminPendingTripsHost");

  if (!host) {
    return;
  }

  if (!trips.length) {
    host.innerHTML = '<div class="alert alert-secondary mb-0">No trips waiting for moderation.</div>';
    return;
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
          <td>${tripModerationBadge(trip.moderation_status)}</td>
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

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date & Time</th>
            <th>Driver</th>
            <th>Price</th>
            <th>Seats</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showAdminPendingTripsError(message) {
  const host = document.getElementById("adminPendingTripsHost");

  if (!host) {
    return;
  }

  host.innerHTML = `<div class="alert alert-danger mb-0">${message}</div>`;
}

function renderUserPendingTrips(trips) {
  const host = document.getElementById("myPendingTripsHost");

  if (!host) {
    return;
  }

  if (!trips.length) {
    host.innerHTML = '<div class="alert alert-secondary mb-0">No pending trips.</div>';
    return;
  }

  const rows = trips
    .map(
      (trip) => `
        <tr>
          <td>${trip.from_city} → ${trip.to_city}</td>
          <td>${formatDateTime(trip.date_time)}</td>
          <td>${Number(trip.price).toFixed(2)} EUR</td>
          <td>${trip.available_seats}</td>
          <td>${tripModerationBadge(trip.moderation_status)}</td>
        </tr>
      `
    )
    .join("");

  host.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead>
          <tr>
            <th>Route</th>
            <th>Date & Time</th>
            <th>Price</th>
            <th>Seats</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function showUserPendingTripsError(message) {
  const host = document.getElementById("myPendingTripsHost");

  if (!host) {
    return;
  }

  host.innerHTML = `<div class="alert alert-danger mb-0">${message}</div>`;
}

function showBookingEditAlert(message, type = "danger") {
  const host = document.getElementById("bookingEditAlert");

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type} mb-0" role="alert">${message}</div>`;
}

function openBookingEditModal(bookingId, source) {
  const booking = source === "admin" ? adminBookingsById.get(bookingId) : userBookingsById.get(bookingId);
  const modalElement = document.getElementById("editBookingModal");

  if (!booking || !modalElement) {
    return;
  }

  const trip = booking.trip;
  const routeInput = document.getElementById("editBookingRoute");
  const dateTimeInput = document.getElementById("editBookingDateTime");
  const driverInput = document.getElementById("editBookingDriver");
  const seatsInput = document.getElementById("editBookingSeats");
  const statusInput = document.getElementById("editBookingStatus");
  const phoneInput = document.getElementById("editBookingPhone");
  const noteInput = document.getElementById("editBookingNote");
  const bookingIdInput = document.getElementById("editBookingId");
  const sourceInput = document.getElementById("editBookingSource");
  const statusRawInput = document.getElementById("editBookingStatusRaw");
  const restrictionHost = document.getElementById("bookingEditRestrictionMessage");
  const saveButton = document.getElementById("saveBookingChangesButton");

  if (
    !(routeInput instanceof HTMLInputElement) ||
    !(dateTimeInput instanceof HTMLInputElement) ||
    !(driverInput instanceof HTMLInputElement) ||
    !(seatsInput instanceof HTMLInputElement) ||
    !(statusInput instanceof HTMLInputElement) ||
    !(phoneInput instanceof HTMLInputElement) ||
    !(noteInput instanceof HTMLTextAreaElement) ||
    !(bookingIdInput instanceof HTMLInputElement) ||
    !(sourceInput instanceof HTMLInputElement) ||
    !(statusRawInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const isUserApprovedLock = source === "user" && booking.status === "approved";

  showBookingEditAlert("");
  if (restrictionHost) {
    if (isUserApprovedLock) {
      restrictionHost.innerHTML = '<div class="alert alert-warning mt-3 mb-0" role="alert">Вече не можете да редактирате своето пътуване! Моля, свържете се с администратор.</div>';
      restrictionHost.classList.remove("d-none");
    } else {
      restrictionHost.innerHTML = "";
      restrictionHost.classList.add("d-none");
    }
  }

  routeInput.value = `${trip?.from_city || "-"} -> ${trip?.to_city || "-"}`;
  dateTimeInput.value = formatDateTime(trip?.date_time);
  driverInput.value = trip?.driver?.full_name || booking.passenger?.full_name || "Unknown";
  seatsInput.value = String(booking.seats_requested || 1);
  statusInput.value = booking.status || "pending";
  phoneInput.value = booking.passenger_phone || booking.passenger?.phone || "";
  noteInput.value = booking.passenger_note || "";
  phoneInput.disabled = isUserApprovedLock;
  noteInput.disabled = isUserApprovedLock;
  bookingIdInput.value = booking.id;
  sourceInput.value = source;
  statusRawInput.value = booking.status || "pending";

  if (saveButton instanceof HTMLButtonElement) {
    saveButton.disabled = isUserApprovedLock;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function bindBookingEditForm(loadContext) {
  const form = document.getElementById("editBookingForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBookingEditAlert("");

    const formData = new FormData(form);
    const bookingId = String(formData.get("booking_id") || "");
    const source = String(formData.get("source") || "user");
    const bookingStatus = String(formData.get("booking_status") || "pending");
    const phone = String(formData.get("passenger_phone") || "").trim();
    const note = String(formData.get("passenger_note") || "").trim();
    const saveButton = document.getElementById("saveBookingChangesButton");

    if (!bookingId) {
      showBookingEditAlert("Missing booking id.");
      return;
    }

    if (source === "user" && bookingStatus === "approved") {
      showBookingEditAlert("Вече не можете да редактирате своето пътуване! Моля, свържете се с администратор.", "warning");
      return;
    }

    if (!phone) {
      showBookingEditAlert("Phone number is required.");
      return;
    }

    if (saveButton instanceof HTMLButtonElement) {
      saveButton.disabled = true;
    }

    try {
      await updateBookingContactDetails(bookingId, {
        passenger_phone: phone,
        passenger_note: note,
      });

      if (source === "admin") {
        await loadContext.loadAdminPendingBookings(true);
      } else {
        await loadContext.loadUserBookings();
      }

      const modalElement = document.getElementById("editBookingModal");

      if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.hide();
      }
    } catch (error) {
      showBookingEditAlert(error.message || "Failed to update booking details.");
    } finally {
      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = false;
      }
    }
  });
}

function mountBookingEditModalToBody() {
  const modalInDom = document.getElementById("editBookingModal");

  if (!modalInDom) {
    return;
  }

  const existingBodyModal = document.body.querySelector("#editBookingModal");

  if (existingBodyModal && existingBodyModal !== modalInDom) {
    modalInDom.remove();
    return;
  }

  if (modalInDom.parentElement !== document.body) {
    document.body.appendChild(modalInDom);
  }
}

async function loadUserPendingTrips(user, isAdmin) {
  const wrapper = document.getElementById("myPendingTripsSection");
  const host = document.getElementById("myPendingTripsHost");

  if (!wrapper || !host) {
    return;
  }

  if (!user || isAdmin) {
    wrapper.classList.add("d-none");
    return;
  }

  wrapper.classList.remove("d-none");
  host.innerHTML = '<div class="text-muted">Loading your pending trips...</div>';

  try {
    const trips = await getAllTrips({}, { includeAll: true });
    const pendingTrips = trips.filter((trip) => trip.driver_id === user.id && trip.moderation_status === "pending");

    if (!pendingTrips.length) {
      wrapper.classList.add("d-none");
      host.innerHTML = "";
      return;
    }

    renderUserPendingTrips(pendingTrips);
  } catch (error) {
    showUserPendingTripsError(error.message || "Failed to load pending trips.");
  }
}

async function loadAdminPendingTrips(isAdmin) {
  const wrapper = document.getElementById("adminPendingTripsSection");
  const host = document.getElementById("adminPendingTripsHost");

  if (!wrapper || !host) {
    return;
  }

  if (!isAdmin) {
    wrapper.classList.add("d-none");
    return;
  }

  wrapper.classList.remove("d-none");
  host.innerHTML = '<div class="text-muted">Loading pending trips...</div>';

  try {
    const trips = await getAllPendingTrips();
    renderAdminPendingTrips(trips);
  } catch (error) {
    showAdminPendingTripsError(error.message || "Failed to load pending trips.");
  }
}

async function loadAdminPendingBookings(isAdmin) {
  const wrapper = document.getElementById("adminPendingBookingsSection");
  const host = document.getElementById("adminPendingBookingsHost");

  if (!wrapper || !host) {
    return;
  }

  if (!isAdmin) {
    wrapper.classList.add("d-none");
    return;
  }

  wrapper.classList.remove("d-none");
  host.innerHTML = '<div class="text-muted">Loading booking requests...</div>';

  try {
    const bookings = await getAllAdminBookings();
    renderAdminPendingBookings(bookings);
  } catch (error) {
    showAdminPendingBookingsError(error.message || "Failed to load pending booking requests.");
  }
}

async function loadUserBookings() {
  const wrapper = document.getElementById("myBookingsSection");
  const host = document.getElementById("myBookingsHost");

  if (!wrapper || !host) {
    return;
  }

  try {
    const { user } = await getCurrentUser();

    if (!user) {
      wrapper.classList.add("d-none");
      return;
    }

    wrapper.classList.remove("d-none");
    host.innerHTML = '<div class="text-muted">Loading your travel bookings...</div>';

    const bookings = await getUserBookings(user.id);
    const activeBookings = bookings.filter((booking) => booking.status === "approved" || booking.status === "pending");

    if (!activeBookings.length) {
      wrapper.classList.add("d-none");
      host.innerHTML = "";
      return;
    }

    renderUserBookings(activeBookings);
  } catch (error) {
    showBookingsError(error.message || "Failed to load your bookings.");
  }
}
function tripCard(trip) {
  const driverName = trip.driver?.full_name || "Unknown driver";
  const imageUrl = trip.car_photo_url || PLACEHOLDER_IMAGE;

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="card h-100 border-0 shadow-sm">
        <img src="${imageUrl}" class="card-img-top" alt="Trip from ${trip.from_city} to ${trip.to_city}" style="height: 180px; object-fit: cover;" />
        <div class="card-body d-flex flex-column">
          <h3 class="h5 card-title mb-2">${trip.from_city} → ${trip.to_city}</h3>
          <p class="card-text text-muted mb-2">${formatDateTime(trip.date_time)}</p>
          <p class="card-text mb-2"><strong>Price:</strong> ${Number(trip.price).toFixed(2)} EUR</p>
          <p class="card-text mb-2"><strong>Available Seats:</strong> ${trip.available_seats}</p>
          <p class="card-text mb-4"><strong>Driver:</strong> ${driverName}</p>
          <a class="btn btn-outline-primary mt-auto" href="/trip-details.html?id=${trip.id}">View Details</a>
        </div>
      </article>
    </div>
  `;
}

function showTripsLoading() {
  const container = document.getElementById("tripsGrid");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
      <p class="mt-3 mb-0 text-muted">Loading trips...</p>
    </div>
  `;
}

function showTripsError(message) {
  const container = document.getElementById("tripsGrid");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger mb-0" role="alert">${message}</div>
    </div>
  `;
}

function renderTrips(trips) {
  const container = document.getElementById("tripsGrid");

  if (!container) {
    return;
  }

  if (!trips.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0" role="alert">No trips found for these filters.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = trips.map((trip) => tripCard(trip)).join("");
}

async function loadTrips(filters = {}, includeAll = false) {
  showTripsLoading();

  try {
    const trips = await getAllTrips(filters, { includeAll });
    renderTrips(trips);
  } catch (error) {
    showTripsError(error.message || "Failed to load trips.");
  }
}

export function HomePage() {
  return `
    <main class="container py-5">
      <section class="home-hero mb-5">
        <div class="hero-glow"></div>
        <div class="hero-glow alt"></div>
        <div class="digital-art-layer" aria-hidden="true">
          <i class="bi bi-airplane-fill travel-icon"></i>
          <i class="bi bi-train-front-fill travel-icon"></i>
          <i class="bi bi-geo-alt-fill travel-icon"></i>
          <i class="bi bi-globe-americas travel-icon"></i>
          <i class="bi bi-luggage-fill travel-icon"></i>
          <i class="bi bi-sign-turn-right-fill travel-icon"></i>
        </div>

        <div class="hero-content">
          <div class="row g-4 align-items-center">
            <div class="col-12 col-lg-7">
              <p class="text-uppercase small mb-2" style="letter-spacing: 0.12em;">Smart Mobility Network</p>
              <h1 class="hero-title mb-3">Travel Smarter Through A Digital Ride Grid</h1>
              <p class="lead text-muted mb-4">Connect with verified drivers, discover routes in seconds, and experience next-gen city-to-city travel.</p>

              <a href="/create-trip.html" class="cta-travel mb-4">
                <i class="bi bi-rocket-takeoff-fill"></i>
                BOOK A TRAVEL
              </a>

              <form id="tripSearchForm" class="row g-3 align-items-end mt-2" novalidate>
                <div class="col-12 col-md-5">
                  <label for="searchFromCity" class="form-label">From City</label>
                  <input id="searchFromCity" name="from_city" type="text" class="form-control" placeholder="Sofia" />
                </div>
                <div class="col-12 col-md-5">
                  <label for="searchToCity" class="form-label">To City</label>
                  <input id="searchToCity" name="to_city" type="text" class="form-control" placeholder="Plovdiv" />
                </div>
                <div class="col-12 col-md-2 d-grid">
                  <button type="submit" class="btn btn-primary">Search</button>
                </div>
              </form>
            </div>
            <div class="col-12 col-lg-5">
              <div id="heroLottie" class="hero-lottie" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div id="myBookingsSection" class="card border-0 shadow-sm mb-4 d-none">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">My Travel Bookings</h2>
              <span class="small text-muted">Active: Approved / Pending</span>
            </div>
            <div id="myBookingsHost"></div>
          </div>
        </div>

        <div id="myPendingTripsSection" class="card border-0 shadow-sm mb-4 d-none">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">My Pending Trips</h2>
              <div class="d-flex align-items-center gap-2">
                <span class="small text-muted">Waiting for administrator approval</span>
                <a href="/profile.html#driver-pane" class="btn btn-sm btn-outline-primary">Open My Trips & Requests</a>
              </div>
            </div>
            <div id="myPendingTripsHost"></div>
          </div>
        </div>

        <div id="adminPendingTripsSection" class="card border-0 shadow-sm mb-4 d-none">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">Pending Trip Approvals</h2>
              <span class="small text-muted">Admin moderation queue for newly created trips</span>
            </div>
            <div id="adminPendingTripsHost"></div>
          </div>
        </div>

        <div id="adminPendingBookingsSection" class="card border-0 shadow-sm mb-4 d-none">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">Booking Requests Feed</h2>
              <span class="small text-muted">Admin overview of all requests and decisions</span>
            </div>
            <div id="adminPendingBookingsHost"></div>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h4 mb-0">Available Smart Routes</h2>
        </div>
        <div id="tripsGrid" class="row g-4"></div>
      </section>
    </main>

    <div class="modal fade" id="editBookingModal" tabindex="-1" aria-labelledby="editBookingModalTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered sr-admin-booking-dialog">
        <div class="modal-content sr-admin-booking-modal">
          <div class="modal-header">
            <h2 class="modal-title fs-5" id="editBookingModalTitle">Edit Booking</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="editBookingForm">
            <div class="modal-body">
              <input type="hidden" id="editBookingId" name="booking_id" />
              <input type="hidden" id="editBookingSource" name="source" />
              <input type="hidden" id="editBookingStatusRaw" name="booking_status" />
              <div id="bookingEditAlert" class="mb-3"></div>
              <div class="row g-3">
                <div class="col-12">
                  <label for="editBookingRoute" class="form-label">Route</label>
                  <input id="editBookingRoute" type="text" class="form-control" readonly />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editBookingDateTime" class="form-label">Date & Time</label>
                  <input id="editBookingDateTime" type="text" class="form-control" readonly />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editBookingDriver" class="form-label">Driver</label>
                  <input id="editBookingDriver" type="text" class="form-control" readonly />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editBookingSeats" class="form-label">Seats</label>
                  <input id="editBookingSeats" type="text" class="form-control" readonly />
                </div>
                <div class="col-12 col-md-6">
                  <label for="editBookingStatus" class="form-label">Status</label>
                  <input id="editBookingStatus" type="text" class="form-control" readonly />
                </div>
                <div class="col-12">
                  <label for="editBookingPhone" class="form-label">Phone</label>
                  <input id="editBookingPhone" name="passenger_phone" type="text" class="form-control" maxlength="40" required />
                </div>
                <div class="col-12">
                  <label for="editBookingNote" class="form-label">Note</label>
                  <textarea id="editBookingNote" name="passenger_note" class="form-control" rows="3" maxlength="600"></textarea>
                </div>
                <div class="col-12 d-none" id="bookingEditRestrictionMessage"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary" id="saveBookingChangesButton">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function setupHomePage() {
  void initHeroLottie();
  mountBookingEditModalToBody();

  const searchForm = document.getElementById("tripSearchForm");
  const myBookingsHost = document.getElementById("myBookingsHost");
  const adminPendingTripsHost = document.getElementById("adminPendingTripsHost");
  const adminPendingBookingsHost = document.getElementById("adminPendingBookingsHost");
  let isAdminViewer = false;

  bindBookingEditForm({ loadUserBookings, loadAdminPendingBookings });

  getCurrentUser()
    .then(({ user, profile }) => {
      isAdminViewer = profile?.role === "admin";
      if (isAdminViewer) {
        setAdminNotificationRefreshCallback(async () => {
          await Promise.all([
            loadAdminPendingTrips(true),
            loadAdminPendingBookings(true),
            loadUserPendingTrips(user, true),
            loadTrips({}, true),
          ]);
        });
      }
      loadUserPendingTrips(user, isAdminViewer);
      loadAdminPendingTrips(isAdminViewer);
      loadAdminPendingBookings(isAdminViewer);
      return loadTrips({}, isAdminViewer);
    })
    .catch(() => {
      isAdminViewer = false;
      loadUserPendingTrips(null, false);
      loadAdminPendingTrips(false);
      loadAdminPendingBookings(false);
      return loadTrips({}, false);
    });

  loadUserBookings();

  if (myBookingsHost) {
    myBookingsHost.addEventListener("click", async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const editButton = target.closest("[data-edit-booking-id]");

      if (editButton instanceof HTMLButtonElement) {
        const bookingId = editButton.getAttribute("data-edit-booking-id");

        if (!bookingId) {
          return;
        }

        openBookingEditModal(bookingId, "user");

        return;
      }

      const button = target.closest("[data-delete-booking-id]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const bookingId = button.getAttribute("data-delete-booking-id");

      if (!bookingId) {
        return;
      }

      const confirmDelete = window.confirm("Delete this travel booking?");

      if (!confirmDelete) {
        return;
      }

      button.disabled = true;

      try {
        await deleteBooking(bookingId);
        await loadUserBookings();
      } catch (error) {
        showBookingsError(error.message || "Failed to delete booking.");
        button.disabled = false;
      }
    });
  }

  if (adminPendingBookingsHost) {
    adminPendingBookingsHost.addEventListener("click", async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const editButton = target.closest("[data-edit-booking-id]");

      if (editButton instanceof HTMLButtonElement) {
        const bookingId = editButton.getAttribute("data-edit-booking-id");

        if (!bookingId) {
          return;
        }

        openBookingEditModal(bookingId, "admin");

        return;
      }

      const button = target.closest("[data-admin-booking-action]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const action = button.getAttribute("data-admin-booking-action");
      const bookingId = button.getAttribute("data-booking-id");
      const tripId = button.getAttribute("data-trip-id");

      if (!action || !bookingId || !tripId) {
        return;
      }

      button.disabled = true;

      try {
        await updateBookingStatus(bookingId, tripId, action);
        await Promise.all([loadAdminPendingBookings(true), loadTrips({}, true)]);
      } catch (error) {
        showAdminPendingBookingsError(error.message || "Failed to update booking request.");
        button.disabled = false;
      }
    });
  }

  if (adminPendingTripsHost) {
    adminPendingTripsHost.addEventListener("click", async (event) => {
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
        await Promise.all([loadAdminPendingTrips(true), loadTrips({}, true)]);
      } catch (error) {
        showAdminPendingTripsError(error.message || "Failed to update trip moderation status.");
        button.disabled = false;
      }
    });
  }

  if (!searchForm) {
    return;
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(searchForm);
    const fromCity = String(formData.get("from_city") || "").trim();
    const toCity = String(formData.get("to_city") || "").trim();

    await loadTrips({
      from_city: fromCity || undefined,
      to_city: toCity || undefined,
    }, isAdminViewer);
  });
}