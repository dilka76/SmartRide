import { getCurrentUser } from "../services/authService.js";
import { uploadCarPhoto } from "../services/storageService.js";

function getDashboardId() {
  const match = window.location.pathname.match(/^\/dashboard(?:\/([^/]+))?\/?$/);
  return match?.[1] ?? null;
}

export function DashboardPage() {
  const dashboardId = getDashboardId();

  return `
    <main class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
          <div class="p-5 bg-white border rounded-4 shadow-sm">
            <h1 class="h3 fw-semibold mb-3">Управление</h1>
            <p class="text-muted">${dashboardId ? `ID на управление: ${dashboardId}` : "Управлявайте вашите пътувания и качвания."}</p>

            <hr class="my-4" />

            <h2 class="h5 mb-3">Качване на снимка на автомобил</h2>
            <div id="dashboardAlert"></div>
            <form id="carPhotoUploadForm" novalidate>
              <div class="mb-3">
                <label for="carPhotoInput" class="form-label">Снимка</label>
                <input id="carPhotoInput" name="carPhoto" class="form-control" type="file" accept="image/png,image/jpeg,image/webp" required />
                <div class="form-text">Разрешено: JPG, PNG, WEBP. Максимален размер конфигуриран в хранилището.</div>
              </div>
              <button id="carPhotoSubmit" type="submit" class="btn btn-primary">Качване на снимка</button>
            </form>

            <div id="carPhotoResult" class="mt-4 d-none">
              <p class="mb-2 fw-semibold">Качена снимка:</p>
              <img id="carPhotoPreview" class="img-fluid rounded border" alt="Uploaded car photo preview" />
              <p class="small text-break mt-2 mb-0" id="carPhotoUrl"></p>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

function showDashboardAlert(message, type = "danger") {
  const host = document.getElementById("dashboardAlert");

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

export function setupDashboardPage() {
  const form = document.getElementById("carPhotoUploadForm");
  const fileInput = document.getElementById("carPhotoInput");
  const submitButton = document.getElementById("carPhotoSubmit");

  if (!form || !fileInput || !submitButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showDashboardAlert("");

    const file = fileInput.files?.[0];

    if (!file) {
      showDashboardAlert("Моля, изберете изображение преди качване.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Качване...";

    try {
      const { user } = await getCurrentUser();

      if (!user) {
        throw new Error("Please sign in to upload car photos.");
      }

      const result = await uploadCarPhoto(file, user.id);
      const resultBox = document.getElementById("carPhotoResult");
      const preview = document.getElementById("carPhotoPreview");
      const urlElement = document.getElementById("carPhotoUrl");

      if (resultBox && preview && urlElement) {
        resultBox.classList.remove("d-none");
        preview.src = result.publicUrl;
        urlElement.textContent = result.publicUrl;
      }

      showDashboardAlert("Photo uploaded successfully.", "success");
      form.reset();
    } catch (error) {
      showDashboardAlert(error.message || "Upload failed. Please try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Качване на снимка";
    }
  });
}