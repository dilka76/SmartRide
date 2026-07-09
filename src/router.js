import { Header } from "./components/Header.js";
import { setupHeaderEvents } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { HomePage } from "./pages/home.js";
import { setupHomePage } from "./pages/home.js";
import { LoginPage } from "./pages/login.js";
import { setupLoginPage } from "./pages/login.js";
import { DashboardPage } from "./pages/dashboard.js";
import { setupDashboardPage } from "./pages/dashboard.js";
import { CreateTripPage } from "./pages/createTrip.js";
import { setupCreateTripPage } from "./pages/createTrip.js";
import { AdminPage } from "./pages/admin.js";
import { setupAdminPage } from "./pages/admin.js";
import { ProfilePage } from "./pages/profile.js";
import { setupProfilePage } from "./pages/profile.js";
import { TripDetailsPage } from "./pages/tripDetails.js";
import { setupTripDetailsPage } from "./pages/tripDetails.js";
import { RegisterPage } from "./pages/register.js";
import { setupRegisterPage } from "./pages/register.js";

function getRoute() {
  // Support both clean paths and *.html entries in MPA mode.
  const pathname = window.location.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    return "home";
  }

  if (pathname === "/login" || pathname === "/login.html") {
    return "login";
  }

  if (pathname === "/register" || pathname === "/register.html") {
    return "register";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/" ) || pathname === "/dashboard.html") {
    return "dashboard";
  }

  if (pathname === "/create-trip" || pathname === "/create-trip.html") {
    return "createTrip";
  }

  if (pathname === "/admin" || pathname === "/admin.html") {
    return "admin";
  }

  if (pathname === "/profile" || pathname === "/profile.html") {
    return "profile";
  }

  if (pathname === "/trip-details" || pathname === "/trip-details.html") {
    return "tripDetails";
  }

  return "home";
}

function getPageMarkup(route) {
  switch (route) {
    case "login":
      return LoginPage();
    case "dashboard":
      return DashboardPage();
    case "createTrip":
      return CreateTripPage();
    case "admin":
      return AdminPage();
    case "profile":
      return ProfilePage();
    case "tripDetails":
      return TripDetailsPage();
    case "register":
      return RegisterPage();
    case "home":
    default:
      return HomePage();
  }
}

function setupPage(route) {
  switch (route) {
    case "login":
      setupLoginPage();
      break;
    case "register":
      setupRegisterPage();
      break;
    case "dashboard":
      setupDashboardPage();
      break;
    case "createTrip":
      setupCreateTripPage();
      break;
    case "admin":
      setupAdminPage();
      break;
    case "profile":
      setupProfilePage();
      break;
    case "tripDetails":
      setupTripDetailsPage();
      break;
    case "home":
      setupHomePage();
      break;
    default:
      break;
  }
}

export async function renderRouter() {
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const route = getRoute();
  // Header depends on auth state, so it is rendered asynchronously.
  const headerMarkup = await Header();

  app.innerHTML = `
    <div class="smart-shell d-flex min-vh-100 flex-column">
      ${headerMarkup}
      ${getPageMarkup(route)}
      ${Footer()}
    </div>
  `;

  setupHeaderEvents();
  setupPage(route);
}

export function initRouter() {
  renderRouter();
  window.addEventListener("popstate", () => {
    renderRouter();
  });
}