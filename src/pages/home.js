import { getCurrentUser } from "../services/authService.js";
import { deleteBooking, getAllTrips, getUserBookings } from "../services/tripService.js";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";

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

  return '<span class="badge bg-warning text-dark">Pending</span>';
}

function renderUserBookings(bookings) {
  const host = document.getElementById("myBookingsHost");

  if (!host) {
    return;
  }

  if (!bookings.length) {
    host.innerHTML = '<div class="alert alert-secondary mb-0">You do not have active travel bookings yet.</div>';
    return;
  }

  const rows = bookings
    .map((booking) => {
      const trip = booking.trip;
      return `
        <tr>
          <td>${trip?.from_city || "-"} → ${trip?.to_city || "-"}</td>
          <td>${formatDateTime(trip?.date_time)}</td>
          <td>${trip?.driver?.full_name || "Unknown"}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td>
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
          <p class="card-text mb-2"><strong>Price:</strong> ${Number(trip.price).toFixed(2)} BGN</p>
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

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h4 mb-0">Available Smart Routes</h2>
        </div>
        <div id="tripsGrid" class="row g-4"></div>
      </section>
    </main>
  `;
}

export function setupHomePage() {
  const searchForm = document.getElementById("tripSearchForm");
  const myBookingsHost = document.getElementById("myBookingsHost");
  let isAdminViewer = false;

  getCurrentUser()
    .then(({ profile }) => {
      isAdminViewer = profile?.role === "admin";
      return loadTrips({}, isAdminViewer);
    })
    .catch(() => {
      isAdminViewer = false;
      return loadTrips({}, false);
    });

  loadUserBookings();

  if (myBookingsHost) {
    myBookingsHost.addEventListener("click", async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
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