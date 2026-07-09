export function Footer() {
  const year = new Date().getFullYear();

  return `
    <footer class="border-top bg-light mt-auto">
      <div class="container py-4 text-center text-muted small">
        <p class="mb-0">&copy; ${year} SmartRide. All rights reserved.</p>
      </div>
    </footer>
  `;
}