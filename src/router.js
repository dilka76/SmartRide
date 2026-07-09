import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { HomePage } from "./pages/home.js";
import { LoginPage } from "./pages/login.js";
import { DashboardPage } from "./pages/dashboard.js";
import { RegisterPage } from "./pages/register.js";

function getRoute() {
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

  return "home";
}

function getPageMarkup(route) {
  switch (route) {
    case "login":
      return LoginPage();
    case "dashboard":
      return DashboardPage();
    case "register":
      return RegisterPage();
    case "home":
    default:
      return HomePage();
  }
}

export function renderRouter() {
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  const route = getRoute();
  app.innerHTML = `
    <div class="d-flex min-vh-100 flex-column bg-body-tertiary">
      ${Header()}
      ${getPageMarkup(route)}
      ${Footer()}
    </div>
  `;
}

export function initRouter() {
  renderRouter();
  window.addEventListener("popstate", renderRouter);
}