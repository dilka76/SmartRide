import {
  adminModerateTrip,
  getAllTrips,
  getDriverTripsWithBookings,
  getUserBookings,
  updateBookingStatus,
} from "../services/tripService.js";

function statusBadge(status) {
  if (status === "approved") {
    return '<span class="badge bg-success">Одобрена</span>';
  }

  if (status === "rejected") {
    return '<span class="badge bg-danger">Отхвърлена</span>';
  }

  return '<span class="badge bg-warning text-dark">Изчакваща</span>';
}

function tripModerationBadge(status) {
  if (status === "approved") {
    return '<span class="badge bg-success">Одобрено</span>';
  }

  if (status === "rejected") {
    return '<span class="badge bg-danger">Отхвърлено</span>';
  }

  return '<span class="badge bg-warning text-dark">Изчакващо</span>';
}

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

function passengerBookingsSection(bookings) {
  if (!bookings.length) {
    return `
      <div class="alert alert-secondary mb-0" role="alert">
        Все още няма резервации.
      </div>
    `;
  }

  const rows = bookings
    .map((booking) => {
      const trip = booking.trip;
      const driverName = trip?.driver?.full_name || "Неизвестен";
      const driverPhone = trip?.driver?.phone || "Не е споделен";

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
            <th>Маршрут</th>
            <th>Дата</th>
            <th>Шофьор</th>
            <th>Телефон на шофьора</th>
            <th>Места</th>
            <th>Статус</th>
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
        Все още не сте създали пътувания.
      </div>
    `;
  }

  return trips
    .map((trip) => {
      const bookingRows = (trip.bookings || [])
        .map((booking) => {
          const passengerName = booking.passenger?.full_name || "Неизвестен";
          const passengerPhone = booking.passenger?.phone || "Не е споделен";
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
                  >Одобри</button>
                  <button
                    class="btn btn-sm btn-danger"
                    type="button"
                    data-booking-action="rejected"
                    data-booking-id="${booking.id}"
                    data-trip-id="${trip.id}"
                    data-driver-id="${trip.driver_id}"
                  >Отхвърли</button>
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
                <div>Места: ${trip.available_seats}</div>
                <div>Цена: ${Number(trip.price).toFixed(2)} EUR</div>
              </div>
            </div>

            ${
              trip.moderation_status === "pending"
                ? '<div class="alert alert-warning py-2 mb-3">Това пътуване очаква одобрение от администратор.</div>'
                : ""
            }
            ${
              trip.moderation_status === "rejected"
                ? '<div class="alert alert-danger py-2 mb-3">Това пътуване е отхвърлено от администратор.</div>'
                : ""
            }

            ${
              bookingRows
                ? `
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Пътник</th>
                      <th>Телефон</th>
                      <th>Места</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>${bookingRows}</tbody>
                </table>
              </div>
            `
                : '<div class="alert alert-light mb-0">Все още няма заявки за резервация за това пътуване.</div>'
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function adminPendingTripsSection(trips) {
  if (!trips.length) {
    return '<div class="alert alert-secondary mb-0">Няма пътувания, които чакат одобрение.</div>';
  }

  const rows = trips
    .map(
      (trip) => `
        <tr>
          <td>${trip.from_city} → ${trip.to_city}</td>
          <td>${formatDateTime(trip.date_time)}</td>
          <td>${trip.driver?.full_name || "Неизвестен"}</td>
          <td>${Number(trip.price).toFixed(2)} EUR</td>
          <td>${trip.available_seats}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" type="button" data-admin-trip-action="approved" data-trip-id="${trip.id}">Одобри</button>
              <button class="btn btn-sm btn-danger" type="button" data-admin-trip-action="rejected" data-trip-id="${trip.id}">Отхвърли</button>
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
            <th>Маршрут</th>
            <th>Дата</th>
            <th>Шофьор</th>
            <th>Цена</th>
            <th>Места</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
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
  const toastContainer = document.getElementById("dashboardToastContainer");

  if (!toastContainer) {
    return;
  }

  const toastId = `dashboard-toast-${Date.now()}`;
  toastContainer.insertAdjacentHTML(
    "beforeend",
    `
      <div id="${toastId}" class="toast align-items-center text-bg-success border-0" role="status" aria-live="polite" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Затвори"></button>
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

async function renderDashboardTabsContent(user, profile) {
  const passengerHost = document.getElementById("passengerBookingsContent");
  const driverHost = document.getElementById("driverTripsContent");
  const adminTripsSection = document.getElementById("adminTripModerationSection");
  const adminTripsHost = document.getElementById("adminTripModerationContent");

  if (!passengerHost || !driverHost) {
    return;
  }

  passengerHost.innerHTML = '<div class="text-muted">Зареждане на резервации...</div>';
  driverHost.innerHTML = '<div class="text-muted">Зареждане на пътувания...</div>';

  if (adminTripsHost) {
    adminTripsHost.innerHTML = '<div class="text-muted">Зареждане на чакащи пътувания...</div>';
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
    showInlineAlert("passengerBookingsContent", error.message || "Неуспешно зареждане на резервациите.");
    showInlineAlert("driverTripsContent", error.message || "Неуспешно зареждане на пътуванията.");

    if (profile?.role === "admin") {
      showInlineAlert("adminTripModerationContent", error.message || "Неуспешно зареждане на чакащите пътувания.");
    }
  }
}

function getBookingActionMessage(action) {
  return action === "approved" ? "Резервацията е одобрена." : "Резервацията е отхвърлена.";
}

function getTripActionMessage(action) {
  return action === "approved" ? "Пътуването е одобрено." : "Пътуването е отхвърлено.";
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
      showInlineAlert("driverTripsContent", "Нямате право да управлявате тази резервация.");
      return;
    }

    target.setAttribute("disabled", "true");

    try {
      await updateBookingStatus(bookingId, tripId, action);
      showToast(getBookingActionMessage(action));
      await renderDashboardTabsContent(user, profile);
    } catch (error) {
      showInlineAlert("driverTripsContent", error.message || "Невъзможно обновяване на статуса на резервацията.");
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
      showToast(getTripActionMessage(action));
      await renderDashboardTabsContent(user, profile);
    } catch (error) {
      showInlineAlert("adminTripModerationContent", error.message || "Невъзможно модериране на пътуването.");
      button.disabled = false;
    }
  });
}

export function DashboardTabsSection() {
  return `
    <section class="mt-4">
      <ul class="nav nav-tabs mb-3" id="dashboardTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="bookings-tab" data-bs-toggle="tab" data-bs-target="#bookings-pane" type="button" role="tab" aria-controls="bookings-pane" aria-selected="true">Моите резервации</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="driver-tab" data-bs-toggle="tab" data-bs-target="#driver-pane" type="button" role="tab" aria-controls="driver-pane" aria-selected="false">Моите пътувания и заявки</button>
        </li>
      </ul>

      <div class="tab-content">
        <div class="tab-pane fade show active" id="bookings-pane" role="tabpanel" aria-labelledby="bookings-tab" tabindex="0">
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
            <h2 class="h5 mb-0">Очакващи одобрение пътувания</h2>
            <span class="small text-muted">Администраторска модерация</span>
          </div>
          <div id="adminTripModerationContent"></div>
        </div>
      </section>

      <div class="toast-container position-fixed bottom-0 end-0 p-3" id="dashboardToastContainer"></div>
    </section>
  `;
}

export async function setupDashboardTabs(user, profile) {
  await renderDashboardTabsContent(user, profile);
  bindDriverActions(user, profile);
  bindAdminTripModerationActions(user, profile);

  if (window.location.hash === "#driver-pane") {
    const driverTab = document.getElementById("driver-tab");

    if (driverTab && typeof bootstrap !== "undefined" && bootstrap.Tab) {
      bootstrap.Tab.getOrCreateInstance(driverTab).show();
    }
  }
}
