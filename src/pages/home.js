import { getAllTrips } from "../services/tripService.js";

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

async function loadTrips(filters = {}) {
  showTripsLoading();

  try {
    const trips = await getAllTrips(filters);
    renderTrips(trips);
  } catch (error) {
    showTripsError(error.message || "Failed to load trips.");
  }
}

export function HomePage() {
  return `
    <main class="container py-5">
      <section class="bg-white border rounded-4 shadow-sm p-4 mb-4">
        <h1 class="h3 fw-semibold mb-1">Find Your Next Ride</h1>
        <p class="text-muted mb-4">Search available trips by departure and destination city.</p>

        <form id="tripSearchForm" class="row g-3 align-items-end" novalidate>
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
      </section>

      <section>
        <div id="tripsGrid" class="row g-4"></div>
      </section>
    </main>
  `;
}

export function setupHomePage() {
  const searchForm = document.getElementById("tripSearchForm");

  loadTrips();

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
    });
  });
}