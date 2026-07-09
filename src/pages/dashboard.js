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
            <h1 class="h3 fw-semibold mb-3">Dashboard</h1>
            <p class="mb-0 text-muted">${dashboardId ? `Dashboard ID: ${dashboardId}` : "Dashboard page placeholder."}</p>
          </div>
        </div>
      </div>
    </main>
  `;
}