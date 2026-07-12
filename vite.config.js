import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  appType: "mpa",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        register: resolve(__dirname, "register.html"),
        admin: resolve(__dirname, "admin.html"),
        profile: resolve(__dirname, "profile.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
        createTrip: resolve(__dirname, "create-trip.html"),
        tripDetails: resolve(__dirname, "trip-details.html"),
        trips: resolve(__dirname, "trips.html"),
      },
    },
  },
});
