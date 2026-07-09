import { signUp } from "../services/authService.js";

export function RegisterPage() {
  return `
    <main class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-5">
          <div class="p-5 bg-white border rounded-4 shadow-sm">
            <h1 class="h3 fw-semibold mb-3">Register</h1>
            <div id="registerAlert"></div>
            <form id="registerForm" novalidate>
              <div class="mb-3">
                <label for="registerFullName" class="form-label">Full Name</label>
                <input id="registerFullName" name="fullName" type="text" class="form-control" placeholder="Jane Doe" required />
              </div>
              <div class="mb-3">
                <label for="registerPhone" class="form-label">Phone</label>
                <input id="registerPhone" name="phone" type="tel" class="form-control" placeholder="+359..." />
              </div>
              <div class="mb-3">
                <label for="registerEmail" class="form-label">Email</label>
                <input id="registerEmail" name="email" type="email" class="form-control" placeholder="you@example.com" required />
              </div>
              <div class="mb-4">
                <label for="registerPassword" class="form-label">Password</label>
                <input id="registerPassword" name="password" type="password" class="form-control" minlength="6" required />
              </div>
              <button id="registerSubmit" type="submit" class="btn btn-success w-100">Create Account</button>
            </form>
          </div>
        </div>
      </div>
    </main>
  `;
}

function showRegisterAlert(message, type = "danger") {
  const alertHost = document.getElementById("registerAlert");

  if (!alertHost) {
    return;
  }

  if (!message) {
    alertHost.innerHTML = "";
    return;
  }

  alertHost.innerHTML = `
    <div class="alert alert-${type}" role="alert">${message}</div>
  `;
}

export function setupRegisterPage() {
  const form = document.getElementById("registerForm");
  const submitButton = document.getElementById("registerSubmit");

  if (!form || !submitButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showRegisterAlert("");

    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
      await signUp(email, password, fullName, phone);
      showRegisterAlert("Registration successful. Redirecting to login...", "success");
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 800);
    } catch (error) {
      showRegisterAlert(error.message || "Registration failed. Please try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create Account";
    }
  });
}