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

// Options helper
const JUZ_MAPPING = {
    '5_juz': [
        { code: '0105', label: 'Juz 1-5: Alif Lam Meem (آلم) to Wal Mohsanat (وَٱلْمُحْصَنَاتُ)' },
        { code: '2630', label: 'Juz 26-30: Ha Meem (حم) to Amma (عَمَّ)' }
    ],
    '15_juz': [
        { code: '0115', label: 'Juz 1-15: Alif Lam Meem (آلم) to Subhanalladhee (سُبْحَانَ ٱلَّذِى)' },
        { code: '1530', label: 'Juz 16-30: Qala Alam (قَالَ أَلَمْ) to Amma (عَمَّ)' },
        { code: '01102630', label: "Juz 1-10 & 26-30: Alif Lam Meem (آلم) to Wa'lamu (وَٱعْلَمُواْ) + Ha Meem (حم) to Amma (عَمَّ)" }
    ],
    '30_juz': [
        { code: '0030', label: 'Juz 1-30: Full Quran (آلم to ٱلنَّاس)' }
    ]
};

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
                console.log(`[Seeder] Successfully logged in using ${url}`);
                break;
            }
        } catch (e) {}
    }

    if (!token) {
        console.error('[Seeder] Error: Authentication failed.');
        process.exit(1);
    }

    // 2. Fetch institutions
    let institutions = [];
    try {
        const res = await fetch(`${PB_URL}/api/collections/institutions/records?perPage=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            institutions = data.items || [];
        }
    } catch (e) {
        console.error('[Seeder] Error fetching institutions:', e);
        process.exit(1);
    }

    if (institutions.length === 0) {
        console.error('[Seeder] Error: No institutions found to link participants to. Run seed_institutions.js first.');
        process.exit(1);
    }

    console.log(`[Seeder] Found ${institutions.length} institutions.`);

    // 3. Read image for upload
    const imagePath = path.join(__dirname, 'eg.jpeg');
    if (!fs.existsSync(imagePath)) {
        console.error(`[Seeder] Error: Seed image not found at ${imagePath}`);
        process.exit(1);
    }
    const imageBuffer = fs.readFileSync(imagePath);

    // 4. Clean up existing mock participants (matching name like "Seed Participant X")
    console.log('[Seeder] Cleaning up existing seed participants...');
    try {
        const listRes = await fetch(`${PB_URL}/api/collections/participants_application/records?perPage=500&filter=full_name~'Seed Participant'`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listRes.ok) {
            const listData = await listRes.json();
            for (const item of listData.items) {
                await fetch(`${PB_URL}/api/collections/participants_application/records/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`[-] Deleted existing seed participant: ${item.full_name}`);
            }
        }
    } catch (err) {
        console.error('[Seeder] Error during participant cleanup:', err);
    }

    // 5. Generate and seed 80 participants
    // We will distribute them across categories:
    // 5_juz (30 candidates), 15_juz (30 candidates), 30_juz (20 candidates)
    const categories = ['5_juz', '15_juz', '30_juz'];
    const instAppsCounts = {}; // Track category counts for each institution to update application field later
    institutions.forEach(inst => {
        instAppsCounts[inst.id] = {
            '5_juz': 0,
            '15_juz': 0,
            '30_juz': 0
        };
    });

    console.log('[Seeder] Seeding 80 participants...');

    for (let i = 1; i <= 80; i++) {
        // Distribute round-robin among institutions
        const inst = institutions[(i - 1) % institutions.length];
        
        // Choose category: 1-30 are 5_juz, 31-60 are 15_juz, 61-80 are 30_juz
        let category = '5_juz';
        if (i > 30 && i <= 60) category = '15_juz';
        if (i > 60) category = '30_juz';

        instAppsCounts[inst.id][category]++;

        // Randomize juz selection inside category
        const juzOpts = JUZ_MAPPING[category];
        const selectedOpt = juzOpts[Math.floor(Math.random() * juzOpts.length)];

        // Generate unique Aadhaar
        const baseAadhaar = 100020003000 + i;
        const aadhaarStr = String(baseAadhaar);

        // Generate dynamic mock DOB
        // 5 juz: max age 15 -> born after 2011 (e.g. 2013)
        // 15 juz: max age 19 -> born after 2007 (e.g. 2009)
        // 30 juz: max age 25 -> born after 2001 (e.g. 2003)
        let birthYear = 2013;
        if (category === '15_juz') birthYear = 2009;
        if (category === '30_juz') birthYear = 2003;
        const dob = `${birthYear}-05-15`;

        const formData = new FormData();
        formData.append('registration_type', 'institution');
        formData.append('institution_ref', inst.id);
        formData.append('institution_id', inst.institution_id);
        formData.append('full_name', `Seed Participant ${i}`);
        formData.append('father_name', `Father of Candidate ${i}`);
        formData.append('father_number', '9876543210');
        formData.append('aadhaar_number', aadhaarStr);
        formData.append('dob', dob);
        formData.append('gender', i % 2 === 0 ? 'male' : 'female');
        formData.append('category', category);
        formData.append('juzz_options', selectedOpt.code);
        formData.append('selected_juz', selectedOpt.label);
        formData.append('whatsapp_number', '9876543211');
        formData.append('email', `seed.participant.${i}@example.com`);
        formData.append('guardian_name', `Guardian of Candidate ${i}`);
        formData.append('guardian_phone', '9876543212');
        formData.append('requires_accommodation', i % 3 === 0 ? 'true' : 'false');
        formData.append('address', `No. ${i}, Mahrut Street, Kayalpatnam, Tamil Nadu - 628204`);
        formData.append('status', 'pending');
        formData.append('is_locked', 'false');

        // Append files
        const docBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('aadhaar_front', docBlob, 'eg.jpeg');
        formData.append('candidate_photo', docBlob, 'eg.jpeg');

        try {
            const res = await fetch(`${PB_URL}/api/collections/participants_application/records`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`[✓] Created participant ${i}: Seed Participant ${i} (Category: ${category}) linked to ${inst.name}`);
            } else {
                const errData = await res.json();
                console.error(`[✗] Failed to create participant ${i}:`, errData);
            }
        } catch (err) {
            console.error(`[✗] Request error for participant ${i}:`, err);
        }
    }

    // 6. Update applications count in each institution
    console.log('[Seeder] Updating institution applications category counts...');
    for (const instId of Object.keys(instAppsCounts)) {
        const counts = instAppsCounts[instId];
        const appsVal = [
            { cat: '5_juz', count: counts['5_juz'] },
            { cat: '15_juz', count: counts['15_juz'] },
            { cat: '30_juz', count: counts['30_juz'] }
        ];

        try {
            const res = await fetch(`${PB_URL}/api/collections/institutions/records/${instId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    applications: JSON.stringify(appsVal)
                })
            });

            if (res.ok) {
                console.log(`[✓] Updated institution ${instId} counts: 5Juz: ${counts['5_juz']}, 15Juz: ${counts['15_juz']}, 30Juz: ${counts['30_juz']}`);
            } else {
                console.error(`[✗] Failed to update counts for institution ${instId}`);
            }
        } catch (err) {
            console.error(`[✗] Request error updating institution ${instId}:`, err);
        }
    }

    console.log('[Seeder] Seeding participants completed successfully.');
}

run().catch(console.error);
