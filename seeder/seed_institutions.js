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

console.log(`[Seeder] Targeting PocketBase URL: ${PB_URL}`);
console.log(`[Seeder] Attempting to authenticate with: ${email}`);

async function run() {
    // 1. Authenticate as admin/superuser
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
                console.log(`[Seeder] Successfully logged in using ${url}`);
                break;
            }
        } catch (e) {
            // Ignore and try next
        }
    }

    if (!token) {
        console.error('[Seeder] Error: Authentication failed. Please provide correct admin credentials.');
        console.error('Usage: node seeder/seed_institutions.js <email> <password>');
        process.exit(1);
    }
    // 2. Read eg.jpeg as Blob
    const imagePath = path.join(__dirname, 'eg.jpeg');
    if (!fs.existsSync(imagePath)) {
        console.error(`[Seeder] Error: Seed image not found at ${imagePath}`);
        process.exit(1);
    }
    const imageBuffer = fs.readFileSync(imagePath);

    // 3. Definition of 10 institutions to insert
    const institutions = [
        { name: "Al-Azhar Arabic College", address: "123 Main St, Area A", contact_person: "Abdullah Khan", email: "alazhar@example.com", whatsapp_number: "9876543210" },
        { name: "Markaz Academy", address: "456 Cross Rd, Area B", contact_person: "Faisal Rahman", email: "markaz@example.com", whatsapp_number: "9876543211" },
        { name: "Darul Uloom School", address: "789 High St, Area C", contact_person: "Zubair Ahmed", email: "darululoom@example.com", whatsapp_number: "9876543212" },
        { name: "Madrasa Noorul Huda", address: "101 Crescent Way, Area D", contact_person: "Mustafa Qureshi", email: "noorulhuda@example.com", whatsapp_number: "9876543213" },
        { name: "Al-Muneer Foundation", address: "202 Olive Ave, Area E", contact_person: "Ibrahim Shareef", email: "almuneer@example.com", whatsapp_number: "9876543214" },
        { name: "Baitul Hikmah Institute", address: "303 Pearl Blvd, Area F", contact_person: "Yusuf Siddiqui", email: "baitulhikmah@example.com", whatsapp_number: "9876543215" },
        { name: "Jamia Millia Islamia", address: "404 Rose Ln, Area G", contact_person: "Saeed Anwar", email: "jamia@example.com", whatsapp_number: "9876543216" },
        { name: "Zeenathul Islam Madrasa", address: "505 Palm Dr, Area H", contact_person: "Bilal Hussain", email: "zeenathul@example.com", whatsapp_number: "9876543217" },
        { name: "Al-Huda Islamic Centre", address: "606 Pine Rd, Area I", contact_person: "Khalid Mansoor", email: "alhuda@example.com", whatsapp_number: "9876543218" },
        { name: "Markazul Uloom", address: "707 Maple Ave, Area J", contact_person: "Umar Farooq", email: "markazululoom@example.com", whatsapp_number: "9876543219" }
    ];

    // Optional: Clear existing seeded institutions by matching mock emails
    console.log('[Seeder] Cleaning up existing seeded institutions...');
    const mockEmails = institutions.map(inst => inst.email);
    try {
        const listRes = await fetch(`${PB_URL}/api/collections/institutions/records?perPage=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listRes.ok) {
            const listData = await listRes.json();
            for (const item of listData.items) {
                if (mockEmails.includes(item.email)) {
                    await fetch(`${PB_URL}/api/collections/institutions/records/${item.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    console.log(`[-] Deleted existing seed institution: ${item.name}`);
                }
            }
        }
    } catch (err) {
        console.error('[Seeder] Error during cleanup:', err);
    }

    console.log('[Seeder] Seeding 10 institutions...');

    for (let i = 0; i < institutions.length; i++) {
        const inst = institutions[i];
        const formData = new FormData();
        formData.append('name', inst.name);
        formData.append('address', inst.address);
        formData.append('contact_person', inst.contact_person);
        formData.append('email', inst.email);
        formData.append('whatsapp_number', inst.whatsapp_number);
        formData.append('passcode', '123456');
        formData.append('status', 'pending');
        formData.append('is_locked', 'false');

        // Append files
        const docBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('document', docBlob, 'eg.jpeg');
        formData.append('instituition_building_proof', docBlob, 'eg.jpeg');

        try {
            const res = await fetch(`${PB_URL}/api/collections/institutions/records`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`[✓] Created: ${inst.name} -> ID: ${data.institution_id}`);
            } else {
                const errData = await res.json();
                console.error(`[✗] Failed to create ${inst.name}:`, errData);
            }
        } catch (err) {
            console.error(`[✗] Request error for ${inst.name}:`, err);
        }
    }

    console.log('[Seeder] Completed.');
}

run().catch(console.error);
