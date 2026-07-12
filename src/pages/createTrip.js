import { getCurrentUser } from "../services/authService.js";
import { createTrip, uploadCarPhoto } from "../services/tripService.js";

export function CreateTripPage() {
  return `
    <main class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
          <div class="bg-white border rounded-4 shadow-sm p-4 p-md-5">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 class="h3 fw-semibold mb-1">Create Trip</h1>
                <p class="text-muted mb-0">Publish your next ride and let passengers book seats.</p>
              </div>
            </div>

            <div id="createTripAlert"></div>

            <form id="createTripForm" novalidate>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label for="fromCity" class="form-label">От град</label>
                  <input id="fromCity" name="from_city" type="text" class="form-control" placeholder="София" required />
                </div>
                <div class="col-12 col-md-6">
                  <label for="toCity" class="form-label">До град</label>
                  <input id="toCity" name="to_city" type="text" class="form-control" placeholder="Пловдив" required />
                </div>
                <div class="col-12 col-md-6">
                  <label for="tripDateTime" class="form-label">Дата и час</label>
                  <input id="tripDateTime" name="date_time" type="datetime-local" class="form-control" required />
                </div>
                <div class="col-12 col-md-3">
                  <label for="tripPrice" class="form-label">Цена</label>
                  <input id="tripPrice" name="price" type="number" min="0" step="0.01" class="form-control" placeholder="25.00" required />
                </div>
                <div class="col-12 col-md-3">
                  <label for="availableSeats" class="form-label">Налични места</label>
                  <input id="availableSeats" name="available_seats" type="number" min="1" step="1" class="form-control" placeholder="3" required />
                </div>
                <div class="col-12">
                  <label for="carPhoto" class="form-label">Снимка на автомобил</label>
                  <input id="carPhoto" name="car_photo" class="form-control" type="file" accept="image/png,image/jpeg,image/webp" />
                </div>
              </div>

              <div class="d-flex justify-content-end mt-4">
                <button id="createTripSubmit" type="submit" class="btn btn-primary px-4">Създай пътуване</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `;
}

function showCreateTripAlert(message, type = "danger") {
  const host = document.getElementById("createTripAlert");

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

function toIsoString(datetimeLocal) {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Please choose a valid date and time.");
  }

  return date.toISOString();
}

export async function setupCreateTripPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const form = document.getElementById("createTripForm");
  const submitButton = document.getElementById("createTripSubmit");

  if (!form || !submitButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showCreateTripAlert("");

    const formData = new FormData(form);
    const carPhotoFile = formData.get("car_photo");

    submitButton.disabled = true;
submitButton.textContent = "Създаване...";

    try {
      const carPhotoUrl = carPhotoFile instanceof File && carPhotoFile.size > 0 ? await uploadCarPhoto(carPhotoFile) : null;

      await createTrip({
        from_city: String(formData.get("from_city") || "").trim(),
        to_city: String(formData.get("to_city") || "").trim(),
        date_time: toIsoString(String(formData.get("date_time") || "")),
        price: String(formData.get("price") || "0"),
        available_seats: String(formData.get("available_seats") || "0"),
        car_photo_url: carPhotoUrl,
      });

      showCreateTripAlert("Пътуването е създадено и изпратено за одобрение на админ. Пренасочване...", "success");
      window.location.href = "/";
    } catch (error) {
      showCreateTripAlert(error.message || "Невъзможно създаване на пътуване. Моля, опитайте отново.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Създай пътуване";
    }
  });
}