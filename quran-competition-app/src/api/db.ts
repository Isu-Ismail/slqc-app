import PocketBase from 'pocketbase';

// Use a relative base URL during development so all requests (including the
// /api/realtime SSE endpoint) are sent to the same origin as the Vite dev
// server. Vite's proxy then forwards them to http://127.0.0.1:8080.
//
// In production (a real domain) PocketBase is served from the same origin or
// you replace this with the absolute URL of your deployed PocketBase instance.
const PB_URL = import.meta.env.VITE_PB_URL ?? '/';

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// Sanity check — confirm the frontend can reach the backend.
pb.health.check()
    .then(() => {
        console.log('[PocketBase] Connected successfully to the backend database.');
    })
    .catch((error) => {
        console.error('[PocketBase] Connection failed. Check your server status or URL:', error);
    });

// Placeholders for Future Authentication & Loading States
export const getCurrentUser = () => pb.authStore.model;
export const isUserLoggedIn = () => pb.authStore.isValid;