export function Header() {
  return `
    <header class="border-bottom bg-white shadow-sm">
      <nav class="navbar navbar-expand-lg navbar-light container py-3">
        <a class="navbar-brand fw-semibold" href="/">SmartRide</a>
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
            <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="/login">Login</a></li>
            <li class="nav-item"><a class="nav-link" href="/register">Register</a></li>
            <li class="nav-item"><a class="nav-link" href="/dashboard">Dashboard</a></li>
          </ul>
        </div>
      </nav>
    </header>
  `;
}