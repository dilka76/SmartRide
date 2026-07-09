export function Footer() {
  const year = new Date().getFullYear();

  return `
    <footer class="mt-auto">
      <div class="container py-4 text-center text-muted small">
        <p class="mb-1">&copy; ${year} SmartRide. Engineered for connected travel.</p>
        <p class="mb-0">High-tech mobility platform for modern travelers.</p>
      </div>
    </footer>
  `;
}