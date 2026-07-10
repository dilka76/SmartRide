import { bookSeat, getTripById } from "../services/tripService.js";
import { getCurrentUser } from "../services/authService.js";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80";

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function getTripIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function showTripDetailsAlert(message, type = "danger") {
  const host = document.getElementById("tripDetailsAlert");

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

export function TripDetailsPage() {
  return `
    <main class="container py-5">
      <div id="tripDetailsAlert"></div>
      <section id="tripDetailsContent" class="bg-white border rounded-4 shadow-sm p-4 p-lg-5"></section>
    </main>
  `;
}

function renderTripDetails(trip, user) {
  const container = document.getElementById("tripDetailsContent");

  if (!container) {
    return;
  }

  const isLoggedIn = Boolean(user);
  const isDriver = isLoggedIn && user.id === trip.driver_id;
  const canBook = isLoggedIn && !isDriver && trip.available_seats > 0;
  const disableButton = isDriver || trip.available_seats <= 0;
  const buttonLabel = !isLoggedIn
    ? "Log in to Book"
    : isDriver
      ? "Your Trip"
      : trip.available_seats > 0
        ? "Book a Seat"
        : "No Seats Left";

  container.innerHTML = `
    <div class="row g-4 align-items-stretch">
      <div class="col-12 col-lg-7">
        <img
          src="${trip.car_photo_url || PLACEHOLDER_IMAGE}"
          alt="Car photo for trip ${trip.from_city} to ${trip.to_city}"
          class="img-fluid w-100 rounded-4 border"
          style="height: 100%; max-height: 420px; object-fit: cover;"
        />
      </div>
      <div class="col-12 col-lg-5">
        <div class="h-100 d-flex flex-column">
          <h1 class="h3 fw-semibold mb-3">${trip.from_city} → ${trip.to_city}</h1>
          <ul class="list-group list-group-flush border rounded-3 mb-4">
            <li class="list-group-item"><strong>Date & Time:</strong> ${formatDateTime(trip.date_time)}</li>
            <li class="list-group-item"><strong>Price:</strong> ${Number(trip.price).toFixed(2)} EUR</li>
            <li class="list-group-item"><strong>Available Seats:</strong> ${trip.available_seats}</li>
            <li class="list-group-item"><strong>Driver:</strong> ${trip.driver?.full_name || "Unknown"}</li>
            <li class="list-group-item"><strong>Driver Phone:</strong> ${trip.driver?.phone || "Not shared"}</li>
          </ul>

          ${
            canBook
              ? `
            <div class="mb-3">
              <label for="seatsRequestedSelect" class="form-label">Seats to book</label>
              <select id="seatsRequestedSelect" class="form-select">
                ${Array.from({ length: trip.available_seats }, (_, index) => index + 1)
                  .map((count) => `<option value="${count}">${count}</option>`)
                  .join("")}
              </select>
            </div>
          `
              : ""
          }

          <button id="bookSeatButton" class="btn btn-lg btn-primary mt-auto" type="button" ${disableButton ? "disabled" : ""}>
            ${buttonLabel}
          </button>
          ${!isLoggedIn ? '<p class="small text-muted mt-2 mb-0">You need an account to request a booking.</p>' : ""}
        </div>
      </div>
    </div>
  `;

  const button = document.getElementById("bookSeatButton");
  const seatsSelect = document.getElementById("seatsRequestedSelect");

  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    if (!isLoggedIn) {
      window.location.href = "/login.html";
      return;
    }

    if (!canBook) {
      return;
    }

    button.disabled = true;
    button.textContent = "Sending request...";

    try {
      const selectedSeats = seatsSelect instanceof HTMLSelectElement ? Number(seatsSelect.value) : 1;

      await bookSeat(trip.id, user.id, selectedSeats);
      showTripDetailsAlert("Booking requested! Waiting for driver approval.", "success");
      button.textContent = "Request Sent";
    } catch (error) {
      showTripDetailsAlert(error.message || "Failed to book seat.");
      button.disabled = false;
      button.textContent = "Book a Seat";
    }
  });
}

export async function setupTripDetailsPage() {
  const container = document.getElementById("tripDetailsContent");

  if (!container) {
    return;
  }

  const tripId = getTripIdFromUrl();

  if (!tripId) {
    showTripDetailsAlert("Missing trip ID in URL.");
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
      <p class="mt-3 mb-0 text-muted">Loading trip details...</p>
    </div>
  `;

  try {
    const [{ user }, trip] = await Promise.all([getCurrentUser(), getTripById(tripId)]);
    renderTripDetails(trip, user);
  } catch (error) {
    showTripDetailsAlert(error.message || "Unable to load trip details.");
    container.innerHTML = "";
  }
}