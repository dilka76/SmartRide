# SmartRide Project Guidelines

## Stack
- Use HTML5, CSS3, JavaScript ES modules, Bootstrap 5, Node.js, npm, and Vite.
- Use Supabase via `@supabase/supabase-js` for backend and database access.
- Keep the app as an MPA: each page is a separate HTML file.
- Do not introduce React, Vue, Angular, or TypeScript.

## Architecture
- Keep code modular with separate files for `src/services/`, `src/components/`, `src/utils/`, and page-specific modules.
- Keep functions small, single-purpose, and easy to reuse.
- Prefer clear separation between page markup, behavior, and data access.

## UI
- Build responsive layouts with Bootstrap 5 components before adding custom CSS.
- Use icons from Font Awesome or Bootstrap Icons when they improve clarity.
- Keep styling clean and intentional; avoid monolithic custom UI when Bootstrap already fits.

## Data And Auth
- Assume Supabase Row-Level Security is enabled.
- Use standard Supabase Auth JWT session tokens.
- Treat client-side code as untrusted and keep data access explicit.

## Maintainability
- Avoid large monolithic files.
- Reuse existing components and helpers instead of duplicating logic.
- Prefer simple, readable implementations over clever abstractions.