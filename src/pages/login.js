import { signIn } from "../services/authService.js";

export function LoginPage() {
  return `
    <main class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-5">
          <div class="p-5 bg-white border rounded-4 shadow-sm">
            <h1 class="h3 fw-semibold mb-3">Вход</h1>
            <div id="loginAlert"></div>
            <form id="loginForm" novalidate>
              <div class="mb-3">
                <label for="loginEmail" class="form-label">Имейл</label>
                <input id="loginEmail" name="email" type="email" class="form-control" placeholder="you@example.com" required />
              </div>
              <div class="mb-4">
                <label for="loginPassword" class="form-label">Пароля</label>
                <input id="loginPassword" name="password" type="password" class="form-control" minlength="6" required />
              </div>
              <button id="loginSubmit" type="submit" class="btn btn-primary w-100">Sign In</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  `;
}

function showLoginAlert(message, type = "danger") {
  const alertHost = document.getElementById("loginAlert");

  if (!alertHost) {
    return;
  }

  alertHost.innerHTML = `
    <div class="alert alert-${type}" role="alert">${message}</div>
  `;
}

export function setupLoginPage() {
  const form = document.getElementById("loginForm");
  const submitButton = document.getElementById("loginSubmit");

  if (!form || !submitButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoginAlert("");

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
      await signIn(email, password);
      showLoginAlert("Вход успешен. Пренасочване...", "success");
      window.location.href = "/";
    } catch (error) {
      showLoginAlert(error.message || "Unable to sign in. Please try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Sign In";
    }
  });
}