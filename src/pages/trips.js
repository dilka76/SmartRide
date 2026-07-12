import { getAllTrips } from "../services/tripService.js";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не е налична";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function tripCard(trip) {
  const driverName = trip.driver?.full_name || "Неизвестен шофьор";
  const imageUrl = trip.car_photo_url || PLACEHOLDER_IMAGE;

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="card h-100 border-0 shadow-sm">
        <img src="${imageUrl}" class="card-img-top trip-card-img" alt="Пътуване от ${trip.from_city} до ${trip.to_city}" />
        <div class="card-body d-flex flex-column">
          <h2 class="h5 card-title mb-2">${trip.from_city} → ${trip.to_city}</h2>
          <p class="card-text text-muted mb-2">${formatDateTime(trip.date_time)}</p>
          <p class="card-text mb-2"><strong>Цена:</strong> ${Number(trip.price).toFixed(2)} EUR</p>
          <p class="card-text mb-2"><strong>Налични места:</strong> ${trip.available_seats}</p>
          <p class="card-text mb-4"><strong>Шофьор:</strong> ${driverName}</p>
          <a class="btn btn-outline-primary mt-auto" href="/trip-details.html?id=${trip.id}">Виж детайли</a>
        </div>
      </article>
    </div>
  `;
}

function showTripsLoading() {
  const container = document.getElementById("allTripsGrid");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
      <p class="mt-3 mb-0 text-muted">Зареждане на предстоящите пътувания...</p>
    </div>
  `;
}

function showTripsError(message) {
  const container = document.getElementById("allTripsGrid");

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
  const container = document.getElementById("allTripsGrid");
  const count = document.getElementById("tripsCount");

  if (!container) {
    return;
  }

  if (count) {
    count.textContent = `${trips.length} предстоящи пътувания`;
  }

  if (!trips.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0" role="alert">В момента няма налични предстоящи пътувания.</div>
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
    showTripsError(error.message || "Неуспешно зареждане на предстоящите пътувания.");
  }
}

function bindTripsFilters() {
  const form = document.getElementById("tripsFilterForm");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const filters = {
      from_city: String(formData.get("from_city") || "").trim(),
      to_city: String(formData.get("to_city") || "").trim(),
    };

    await loadTrips(filters);
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      loadTrips();
    }, 0);
  });
}

export function TripsPage() {
  return `
    <main class="container py-5">
      <section class="card border-0 shadow-sm mb-4 overflow-hidden">
        <div class="card-body p-4 p-lg-5">
          <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3">
            <div>
              <p class="text-uppercase small mb-2" style="letter-spacing: 0.12em;">SmartRide маршрути</p>
              <h1 class="h2 fw-semibold mb-2">Всички предстоящи пътувания</h1>
              <p class="text-muted mb-0">Разгледай всички налични маршрути, подредени по дата, и избери най-удобното пътуване за теб.</p>
            </div>
            <div class="text-lg-end">
              <div id="tripsCount" class="small text-muted">Зареждане...</div>
            </div>
          </div>
        </div>
      </section>

      <section class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <form id="tripsFilterForm" class="row g-3 align-items-end" novalidate>
            <div class="col-12 col-md-5">
              <label for="tripsFromCity" class="form-label">От град</label>
              <input id="tripsFromCity" name="from_city" type="text" class="form-control" placeholder="София" />
            </div>
            <div class="col-12 col-md-5">
              <label for="tripsToCity" class="form-label">До град</label>
              <input id="tripsToCity" name="to_city" type="text" class="form-control" placeholder="Варна" />
            </div>
            <div class="col-12 col-md-2 d-grid gap-2">
              <button type="submit" class="btn btn-primary">Търсене</button>
              <button type="reset" class="btn btn-outline-secondary">Изчисти</button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div id="allTripsGrid" class="row g-4"></div>
      </section>
    </main>
  `;
}

export function setupTripsPage() {
  bindTripsFilters();
  loadTrips();
}