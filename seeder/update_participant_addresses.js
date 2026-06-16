import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurations
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8080';
const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'Admin@1234';

const email = process.argv[2] || DEFAULT_EMAIL;
const password = process.argv[3] || DEFAULT_PASSWORD;

console.log(`[Address Updater] Targeting PocketBase URL: ${PB_URL}`);

async function run() {
    // 1. Authenticate
    let token = '';
    const authUrls = [
        `${PB_URL}/api/collections/_superusers/auth-with-password`,
        `${PB_URL}/api/admins/auth-with-password`,
        `${PB_URL}/api/collections/users/auth-with-password`
    ];

    for (const url of authUrls) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: email, password })
            });
            if (res.ok) {
                const data = await res.json();
                token = data.token;
                console.log(`[Address Updater] Successfully logged in using ${url}`);
                break;
            }
        } catch (e) {}
    }

    if (!token) {
        console.error('[Address Updater] Error: Authentication failed.');
        process.exit(1);
    }

    // 2. Fetch all participants
    console.log('[Address Updater] Fetching all participant records...');
    let participants = [];
    try {
        const res = await fetch(`${PB_URL}/api/collections/participants_application/records?perPage=500`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            participants = data.items || [];
        }
    } catch (e) {
        console.error('[Address Updater] Error fetching participants:', e);
        process.exit(1);
    }

    console.log(`[Address Updater] Found ${participants.length} participants.`);

    // 3. Update addresses
    let updatedCount = 0;
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        
        // Only update if address is empty/falsy
        if (!p.address) {
            const mockAddress = `No. ${i + 1}, Mahrut Street, Kayalpatnam, Tamil Nadu - 628204`;
            try {
                const res = await fetch(`${PB_URL}/api/collections/participants_application/records/${p.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ address: mockAddress })
                });

                if (res.ok) {
                    console.log(`[✓] Updated address for: ${p.full_name}`);
                    updatedCount++;
                } else {
                    console.error(`[✗] Failed to update address for: ${p.full_name}`);
                }
            } catch (err) {
                console.error(`[✗] Request error for ${p.full_name}:`, err);
            }
        } else {
            console.log(`[-] Skipping ${p.full_name} (address already set)`);
        }
    }

    console.log(`[Address Updater] Completed! Updated ${updatedCount} participant addresses.`);
}

run().catch(console.error);
