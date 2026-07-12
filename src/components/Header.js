import { getCurrentUser, signOut } from "../services/authService.js";

function loggedOutLinks() {
  return `
    <li class="nav-item"><a class="nav-link" href="/">Начало</a></li>
    <li class="nav-item"><a class="nav-link" href="/login.html">Вход</a></li>
    <li class="nav-item"><a class="nav-link" href="/register.html">Регистрация</a></li>
  `;
}

function loggedInLinks(isAdmin) {
  return `
    <li class="nav-item"><a class="nav-link" href="/">Начало</a></li>
    <li class="nav-item"><a class="nav-link" href="/create-trip.html">Създай пътуване</a></li>
    <li class="nav-item"><a class="nav-link" href="/profile.html">Профил</a></li>
    <li class="nav-item"><a class="nav-link" href="/dashboard.html">Управление</a></li>
    ${isAdmin ? '<li class="nav-item"><a class="nav-link" href="/admin.html">Администраторски панел</a></li>' : ""}
    <li class="nav-item">
      <button id="logoutBtn" class="btn btn-outline-danger btn-sm ms-lg-2" type="button">Изход</button>
    </li>
  `;
}

export async function Header() {
  let authState = { user: null, profile: null };

  try {
    authState = await getCurrentUser();
  } catch {
    authState = { user: null, profile: null };
  }

  const isLoggedIn = Boolean(authState.user);
  const isAdmin = authState.profile?.role === "admin";
  const userName = authState.profile?.full_name || authState.user?.email || "User";

  return `
    <header>
      <nav class="navbar navbar-expand-lg navbar-dark container py-3 px-3 px-lg-4">
        <a class="navbar-brand fw-semibold d-flex align-items-center gap-2" href="/">
          <i class="bi bi-cpu-fill" aria-hidden="true"></i>
          SmartRide
        </a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#primaryNav"
          aria-controls="primaryNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="primaryNav">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0 gap-lg-2">
            ${isLoggedIn ? loggedInLinks(isAdmin) : loggedOutLinks()}
          </ul>
          ${isLoggedIn ? `<span class="ms-lg-3 text-muted small">Signed in as ${userName}</span>` : ""}
        </div>
      </nav>
    </header>
  `;
}

export function setupHeaderEvents() {
  const logoutButton = document.getElementById("logoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async () => {
    try {
      await signOut();
      window.location.href = "/login.html";
    } catch (error) {
      window.alert(error.message || "Failed to sign out.");
    }
  });
}