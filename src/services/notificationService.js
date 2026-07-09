import { getCurrentUser } from "./authService.js";
import { getAllPendingBookings, getUserBookings } from "./tripService.js";

const POLL_INTERVAL_MS = 30000;
let notificationTimerId = null;

function storageKeyForUser(userId) {
  return `smartride_booking_status_snapshot_${userId}`;
}

function adminStorageKeyForUser(userId) {
  return `smartride_admin_pending_snapshot_${userId}`;
}

function getStatusSnapshot(userId) {
  const key = storageKeyForUser(userId);

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatusSnapshot(userId, snapshot) {
  const key = storageKeyForUser(userId);
  localStorage.setItem(key, JSON.stringify(snapshot));
}

function getAdminPendingSnapshot(userId) {
  const key = adminStorageKeyForUser(userId);

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAdminPendingSnapshot(userId, bookingIds) {
  const key = adminStorageKeyForUser(userId);
  localStorage.setItem(key, JSON.stringify(bookingIds));
}

function ensureToastContainer() {
  let container = document.getElementById("globalBookingToastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "globalBookingToastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }

  return container;
}

function showBookingStatusToast(message, isApproved) {
  const container = ensureToastContainer();
  const toastId = `booking-toast-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  const styleClass = isApproved ? "text-bg-success" : "text-bg-danger";

  container.insertAdjacentHTML(
    "beforeend",
    `
      <div id="${toastId}" class="toast align-items-center ${styleClass} border-0" role="status" aria-live="polite" aria-atomic="true">
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

  if (typeof bootstrap === "undefined" || !bootstrap.Toast) {
    window.alert(message);
    toastElement.remove();
    return;
  }

  const toast = new bootstrap.Toast(toastElement, { delay: 4500 });
  toast.show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

function ensureAdminBookingModal() {
  let modalElement = document.getElementById("adminNewBookingModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="adminNewBookingModal" tabindex="-1" aria-labelledby="adminNewBookingModalTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg sr-admin-booking-dialog">
          <div class="modal-content sr-admin-booking-modal">
            <div class="modal-header border-0 pb-0">
              <h2 class="modal-title fs-5" id="adminNewBookingModalTitle">New Booking Request</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body pt-3" id="adminNewBookingModalBody"></div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Review Later</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const element = wrapper.firstElementChild;

    if (element) {
      document.body.appendChild(element);
    }

    modalElement = document.getElementById("adminNewBookingModal");
  }

  return modalElement;
}

function showAdminNewBookingModal(bookings) {
  if (!bookings.length) {
    return;
  }

  const modalElement = ensureAdminBookingModal();
  const body = document.getElementById("adminNewBookingModalBody");

  if (!modalElement || !body) {
    return;
  }

  body.innerHTML = bookings
    .map((booking) => {
      const passenger = booking.passenger?.full_name || "Unknown passenger";
      const route = `${booking.trip?.from_city || "Unknown"} -> ${booking.trip?.to_city || "Unknown"}`;
      return `
        <div class="sr-admin-booking-item ${booking === bookings[bookings.length - 1] ? "" : "mb-3"}">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div class="fw-semibold">${passenger}</div>
              <div class="text-muted small">${route}</div>
            </div>
            <span class="badge rounded-pill bg-warning text-dark">Pending</span>
          </div>
          <div class="small text-muted mt-2">Seats requested: ${booking.seats_requested || 1}</div>
        </div>
      `;
    })
    .join("");

  if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
    window.alert("New booking request received.");
    return;
  }

  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

function buildNotificationMessage(booking) {
  const route = `${booking.trip?.from_city || "Unknown"} -> ${booking.trip?.to_city || "Unknown"}`;

  if (booking.status === "approved") {
    return {
      text: `Booking approved for ${route}. Your seat is confirmed.`,
      approved: true,
    };
  }

  return {
    text: `Booking rejected for ${route}. Please choose another trip.`,
    approved: false,
  };
}

async function checkBookingNotifications() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    return;
  }

  if (profile?.role === "admin") {
    const pendingBookings = await getAllPendingBookings();
    const previousPendingIds = getAdminPendingSnapshot(user.id);
    const nextPendingIds = pendingBookings.map((booking) => booking.id);
    const previousPendingSet = new Set(previousPendingIds);
    const newPendingBookings = pendingBookings.filter((booking) => !previousPendingSet.has(booking.id));

    if (previousPendingIds.length > 0 && newPendingBookings.length > 0) {
      showAdminNewBookingModal(newPendingBookings);
    }

    saveAdminPendingSnapshot(user.id, nextPendingIds);
    return;
  }

  const bookings = await getUserBookings(user.id);
  const previousSnapshot = getStatusSnapshot(user.id);
  const nextSnapshot = {};

  for (const booking of bookings) {
    const previousStatus = previousSnapshot[booking.id];
    const nextStatus = booking.status;

    nextSnapshot[booking.id] = nextStatus;

    if (nextStatus !== "approved" && nextStatus !== "rejected") {
      continue;
    }

    if (!previousStatus || previousStatus === nextStatus) {
      continue;
    }

    const message = buildNotificationMessage(booking);
    showBookingStatusToast(message.text, message.approved);
  }

  saveStatusSnapshot(user.id, nextSnapshot);
}

export function startBookingNotifications() {
  if (notificationTimerId) {
    return;
  }

  checkBookingNotifications().catch(() => {
    // Silent fail to avoid breaking UI if notifications fail.
  });

  notificationTimerId = window.setInterval(() => {
    checkBookingNotifications().catch(() => {
      // Silent fail to avoid noisy polling errors.
    });
  }, POLL_INTERVAL_MS);
}