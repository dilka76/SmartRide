import { getCurrentUser, updateCurrentUserProfile } from "../services/authService.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function profileInfoSection(user, profile) {
  return `
    <div class="row g-3">
      <div class="col-12 col-md-6">
        <div class="small text-muted">Име</div>
        <div class="fw-semibold">${escapeHtml(profile?.full_name || "Не е зададено")}</div>
      </div>
      <div class="col-12 col-md-6">
        <div class="small text-muted">Имейл</div>
        <div class="fw-semibold">${escapeHtml(user.email || "Не е наличен")}</div>
      </div>
      <div class="col-12 col-md-6">
        <div class="small text-muted">Телефон</div>
        <div class="fw-semibold">${escapeHtml(profile?.phone || "Не е зададен")}</div>
      </div>
      <div class="col-12 col-md-6">
        <div class="small text-muted">Avatar URL</div>
        <div class="fw-semibold text-break">${escapeHtml(profile?.avatar_url || "Не е зададен")}</div>
      </div>
      <div class="col-12 col-md-6">
        <div class="small text-muted">Роля</div>
        <div class="fw-semibold">${escapeHtml(profile?.role || "user")}</div>
      </div>
    </div>
  `;
}

function showProfileAlert(message, type = "danger") {
  const host = document.getElementById("profileAlert");

  if (!host) {
    return;
  }

  if (!message) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

function renderProfileContent(user, profile) {
  const profileInfoHost = document.getElementById("profileInfoContent");

  if (!profileInfoHost) {
    return;
  }

  profileInfoHost.innerHTML = profileInfoSection(user, profile);
}

function populateProfileForm(user, profile) {
  const fullNameInput = document.getElementById("profileFullName");
  const emailInput = document.getElementById("profileEmail");
  const phoneInput = document.getElementById("profilePhone");
  const avatarUrlInput = document.getElementById("profileAvatarUrl");

  if (
    !(fullNameInput instanceof HTMLInputElement) ||
    !(emailInput instanceof HTMLInputElement) ||
    !(phoneInput instanceof HTMLInputElement) ||
    !(avatarUrlInput instanceof HTMLInputElement)
  ) {
    return;
  }

  fullNameInput.value = profile?.full_name || "";
  emailInput.value = user.email || "";
  phoneInput.value = profile?.phone || "";
  avatarUrlInput.value = profile?.avatar_url || "";
}

function setEditMode(isEditing) {
  const editButton = document.getElementById("editProfileButton");
  const form = document.getElementById("profileEditForm");
  const summaryHost = document.getElementById("profileInfoContent");

  if (!(editButton instanceof HTMLButtonElement) || !(form instanceof HTMLFormElement) || !summaryHost) {
    return;
  }

  form.classList.toggle("d-none", !isEditing);
  summaryHost.classList.toggle("d-none", isEditing);
  editButton.textContent = isEditing ? "Затвори" : "Редактирай";
}

export function ProfilePage() {
  return `
    <main class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 fw-semibold mb-1">Мой профил</h1>
          <p class="text-muted mb-0">Преглеждайте и редактирайте вашата потребителска информация.</p>
        </div>
        <button id="editProfileButton" type="button" class="btn btn-outline-primary">Редактирай</button>
      </div>

      <div id="profileAlert"></div>

      <section class="card border-0 shadow-sm">
        <div class="card-body">
          <h2 class="h5 mb-3">Информация за профила</h2>
          <div id="profileInfoContent"></div>

          <form id="profileEditForm" class="d-none mt-3" novalidate>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label for="profileFullName" class="form-label">Име</label>
                <input id="profileFullName" name="full_name" type="text" class="form-control" maxlength="120" required />
              </div>
              <div class="col-12 col-md-6">
                <label for="profileEmail" class="form-label">Имейл</label>
                <input id="profileEmail" type="email" class="form-control" readonly />
              </div>
              <div class="col-12 col-md-6">
                <label for="profilePhone" class="form-label">Телефон</label>
                <input id="profilePhone" name="phone" type="tel" class="form-control" maxlength="40" />
              </div>
              <div class="col-12 col-md-6">
                <label for="profileAvatarUrl" class="form-label">Avatar URL</label>
                <input id="profileAvatarUrl" name="avatar_url" type="url" class="form-control" maxlength="500" placeholder="https://..." />
              </div>
            </div>

            <div class="d-flex gap-2 mt-4">
              <button id="saveProfileButton" type="submit" class="btn btn-primary">Запази промените</button>
              <button id="cancelProfileEditButton" type="button" class="btn btn-outline-secondary">Отказ</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  `;
}

export async function setupProfilePage() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  let currentProfile = profile;
  const editButton = document.getElementById("editProfileButton");
  const form = document.getElementById("profileEditForm");
  const cancelButton = document.getElementById("cancelProfileEditButton");
  const saveButton = document.getElementById("saveProfileButton");

  renderProfileContent(user, currentProfile);
  populateProfileForm(user, currentProfile);

  if (
    !(editButton instanceof HTMLButtonElement) ||
    !(form instanceof HTMLFormElement) ||
    !(cancelButton instanceof HTMLButtonElement) ||
    !(saveButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  editButton.addEventListener("click", () => {
    showProfileAlert("");
    const shouldOpen = form.classList.contains("d-none");
    populateProfileForm(user, currentProfile);
    setEditMode(shouldOpen);
  });

  cancelButton.addEventListener("click", () => {
    populateProfileForm(user, currentProfile);
    showProfileAlert("");
    setEditMode(false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showProfileAlert("");

    const formData = new FormData(form);
    const fullName = String(formData.get("full_name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const avatarUrl = String(formData.get("avatar_url") || "").trim();

    if (!fullName) {
      showProfileAlert("Името е задължително.");
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Запазване...";

    try {
      currentProfile = await updateCurrentUserProfile({
        full_name: fullName,
        phone,
        avatar_url: avatarUrl,
      });
      renderProfileContent(user, currentProfile);
      populateProfileForm(user, currentProfile);
      setEditMode(false);
      showProfileAlert("Профилът беше обновен успешно.", "success");
    } catch (error) {
      showProfileAlert(error.message || "Неуспешно обновяване на профила.");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Запази промените";
    }
  });
}
