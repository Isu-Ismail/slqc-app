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

console.log(`[Seeder] Targeting PocketBase URL (Final): ${PB_URL}`);

const CATEGORY_TEMPLATES = {
    '5_juz': [
        { key: 'c1782124908579', label: 'Memory', numQuestions: 1, outOf: 25 },
        { key: 'c1782124909566', label: 'Tajweed', numQuestions: 1, outOf: 10 },
        { key: 'c1782124910495', label: 'Surah Name', numQuestions: 1, outOf: 5 },
        { key: 'c1782124911896', label: 'Mutashabihat1', numQuestions: 4, outOf: 7.5 },
        { key: 'c1782199009489', label: 'Mutashabithat2', numQuestions: 4, outOf: 7.5 }
    ],
    '15_juz': [
        { key: 'c1782126217530', label: 'Memory', numQuestions: 1, outOf: 20 },
        { key: 'c1782126218361', label: 'Tajweed', numQuestions: 1, outOf: 15 },
        { key: 'c1782126219189', label: 'Surah Name', numQuestions: 1, outOf: 5 },
        { key: 'c1782126220059', label: 'Mutashabihat-1', numQuestions: 4, outOf: 7.5 },
        { key: 'c1782199324497', label: 'Mutashabihat-2', numQuestions: 4, outOf: 7.5 }
    ],
    '30_juz': [
        { key: 'c1782126279191', label: 'Memory', numQuestions: 1, outOf: 20 },
        { key: 'c1782126279977', label: 'Tajweed', numQuestions: 1, outOf: 15 },
        { key: 'c1782126280780', label: 'Surah Name', numQuestions: 1, outOf: 5 },
        { key: 'c1782126281616', label: 'Mutshabihat-1', numQuestions: 4, outOf: 7.5 },
        { key: 'c1782199393325', label: 'Mutshabihat-2', numQuestions: 4, outOf: 7.5 }
    ]
};

async function run() {
    // 1. Authenticate
    let token = '';
    let adminLoginId = '';
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
                adminLoginId = data.record?.id || data.admin?.id || 'admin';
                console.log(`[Seeder] Successfully logged in using ${url}`);
                break;
            }
        } catch (e) {}
    }

    if (!token) {
        console.error('[Seeder] Error: Authentication failed.');
        process.exit(1);
    }

    // Get a valid user ID from the users collection for uploaded_by relation
    let userId = '';
    try {
        const usersRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            if (usersData.items && usersData.items.length > 0) {
                userId = usersData.items[0].id;
                console.log(`[Seeder] Found coordinator/user: ${usersData.items[0].name || usersData.items[0].username} (${userId}) to link uploaded marksheets.`);
            }
        }
    } catch (e) {
        console.error('[Seeder] Error fetching a user record:', e);
    }

    if (!userId) {
        console.warn('[Seeder] Warning: No user found in users collection to link to uploaded_by. We will fallback to admin ID.');
        userId = adminLoginId;
    }

    // 2. Setup / Seed Mark Templates if they don't exist
    const categories = ['5_juz', '15_juz', '30_juz'];
    const round = 'final';

    console.log('[Seeder] Ensuring final mark templates are seeded...');
    for (const category of categories) {
        const currentCriteria = CATEGORY_TEMPLATES[category];
        try {
            const checkRes = await fetch(`${PB_URL}/api/collections/mark_templates/records?filter=round='${round}'%26%26category='${category}'`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const checkData = await checkRes.json();

            if (checkData.items && checkData.items.length > 0) {
                // Update the existing templates to make sure they match the final round criteria
                const templateId = checkData.items[0].id;
                const updateRes = await fetch(`${PB_URL}/api/collections/mark_templates/records/${templateId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        columns: JSON.stringify({
                            questions: [],
                            criteria: currentCriteria
                        })
                    })
                });
                if (updateRes.ok) {
                    console.log(`[✓] Template updated for Round: ${round}, Category: ${category}`);
                } else {
                    console.error(`[✗] Failed to update template for Round: ${round}, Category: ${category}`);
                }
            } else {
                const createRes = await fetch(`${PB_URL}/api/collections/mark_templates/records`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        round,
                        category,
                        columns: JSON.stringify({
                            questions: [],
                            criteria: currentCriteria
                        })
                    })
                });
                if (createRes.ok) {
                    console.log(`[✓] Created template for Round: ${round}, Category: ${category}`);
                } else {
                    console.error(`[✗] Failed to create template for Round: ${round}, Category: ${category}`);
                }
            }
        } catch (err) {
            console.error(`[✗] Error checking/updating template for ${round}/${category}:`, err);
        }
    }

    // 3. Fetch finalists who are present (arrival_status != 'absent') and allocated a final venue
    console.log('[Seeder] Fetching eligible final round participants...');
    let participants = [];
    try {
        const filter = encodeURIComponent("status='approved' && arrival_status!='absent' && final_venue!='' && is_finalist=true");
        const res = await fetch(`${PB_URL}/api/collections/participants_application/records?perPage=500&filter=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            participants = data.items || [];
        } else {
            console.error('[Seeder] Failed to fetch participants:', await res.text());
            process.exit(1);
        }
    } catch (err) {
        console.error('[Seeder] Error fetching participants:', err);
        process.exit(1);
    }

    if (participants.length === 0) {
        console.log('[Seeder] No participants found that are present and allocated to a final venue (is_finalist = true).');
        return;
    }

    console.log(`[Seeder] Found ${participants.length} eligible final round participants.`);

    // 4. Read seed marksheet image
    const imagePath = path.join(__dirname, 'eg.jpeg');
    if (!fs.existsSync(imagePath)) {
        console.error(`[Seeder] Error: Seed image eg.jpeg not found at ${imagePath}`);
        process.exit(1);
    }
    const imageBuffer = fs.readFileSync(imagePath);

    // 5. Fetch venue detail to get assigned judges
    console.log('[Seeder] Fetching venues list...');
    let venues = [];
    try {
        const res = await fetch(`${PB_URL}/api/collections/venue_detail/records?perPage=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            venues = data.items || [];
        }
    } catch (e) {
        console.error('[Seeder] Error fetching venues:', e);
    }

    // 6. Fetch judges list
    console.log('[Seeder] Fetching judges list...');
    let judges = [];
    try {
        const res = await fetch(`${PB_URL}/api/collections/judges/records?perPage=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            judges = data.items || [];
        }
    } catch (e) {
        console.error('[Seeder] Error fetching judges:', e);
    }

    if (judges.length === 0) {
        console.error('[Seeder] Error: No judges found. Please seed judges first.');
        process.exit(1);
    }

    // Fetch mark templates from DB
    console.log('[Seeder] Fetching templates list...');
    let templates = [];
    try {
        const res = await fetch(`${PB_URL}/api/collections/mark_templates/records?perPage=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            templates = data.items || [];
        }
    } catch (e) {
        console.error('[Seeder] Error fetching templates:', e);
    }

    // 7. Seed marks for each participant
    for (const student of participants) {
        const venueName = student.final_venue;
        
        // Find judges allocated to this venue
        let studentJudges = [];
        const venueRec = venues.find(v => v.name === venueName);
        if (venueRec && venueRec.judges) {
            let parsed = [];
            try {
                parsed = typeof venueRec.judges === 'string' ? JSON.parse(venueRec.judges) : venueRec.judges;
            } catch (_) {}
            if (Array.isArray(parsed)) {
                parsed.forEach(j => {
                    const jId = typeof j === 'object' ? j.id : j;
                    const match = judges.find(jg => jg.id === jId);
                    if (match) studentJudges.push(match);
                });
            }
        }

        // Fallback: Assign first three judges if none allocated to the venue
        if (studentJudges.length === 0) {
            studentJudges = judges.slice(0, 3);
        }

        // Get dynamic criteria list from template
        const category = student.category;
        let studentCriteria = CATEGORY_TEMPLATES[category] || [];
        const templateRec = templates.find(t => t.round === round && t.category === category);
        if (templateRec) {
            try {
                const cols = typeof templateRec.columns === 'string' ? JSON.parse(templateRec.columns) : templateRec.columns;
                if (cols && Array.isArray(cols.criteria)) {
                    studentCriteria = cols.criteria;
                }
            } catch (_) {}
        }

        console.log(`[Seeder] Seeding marks for ${student.full_name} (${student.participant_id}) at ${venueName} (Round: ${round}) with ${studentJudges.length} judges using ${studentCriteria.length} criteria...`);

        // Generate scoring values and calculate totals
        const scoringValues = {};
        const judgeTotals = {};
        let grandTotal = 0;

        studentJudges.forEach(j => {
            scoringValues[j.id] = {};
            let jTotal = 0;

            studentCriteria.forEach(c => {
                scoringValues[j.id][c.key] = {};
                for (let i = 0; i < c.numQuestions; i++) {
                    const outOfNum = parseFloat(c.outOf);
                    const minScore = Math.max(0, outOfNum - 2); // Less deduction for finalists
                    const score = Math.floor(Math.random() * (outOfNum - minScore + 1)) + minScore;
                    scoringValues[j.id][c.key][i] = score;
                    jTotal += score;
                }
            });

            judgeTotals[j.id] = jTotal;
            grandTotal += jTotal;
        });

        const grandAverage = studentJudges.length > 0 ? Number((grandTotal / studentJudges.length).toFixed(2)) : 0;

        const payload = {
            judges: scoringValues,
            totals: {
                judgeTotals,
                grandTotal,
                grandAverage
            }
        };

        // Save and freeze the marks
        try {
            const marksCollection = 'final_marks';
            const checkRes = await fetch(`${PB_URL}/api/collections/${marksCollection}/records?filter=participant_ref='${student.id}'`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const checkData = await checkRes.json();

            let saveRes;
            if (checkData.items && checkData.items.length > 0) {
                // Update
                const recordId = checkData.items[0].id;
                saveRes = await fetch(`${PB_URL}/api/collections/${marksCollection}/records/${recordId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: JSON.stringify(payload),
                        is_frozen: true
                    })
                });
            } else {
                // Create
                saveRes = await fetch(`${PB_URL}/api/collections/${marksCollection}/records`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        participant_ref: student.id,
                        values: JSON.stringify(payload),
                        is_frozen: true
                    })
                });
            }

            if (saveRes.ok) {
                console.log(`  [✓] Marks saved & frozen successfully (Grand Average: ${grandAverage})`);
            } else {
                console.error(`  [✗] Failed to save marks:`, await saveRes.text());
            }
        } catch (err) {
            console.error(`  [✗] Error saving marks:`, err);
        }

        // Upload the marksheet (eg.jpeg)
        try {
            const checkRes = await fetch(`${PB_URL}/api/collections/marksheet_uploads/records?filter=participant_ref='${student.id}'%26%26round='${round}'`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const checkData = await checkRes.json();

            if (checkData.items && checkData.items.length > 0) {
                console.log(`  [✓] Marksheet already uploaded`);
            } else {
                const formData = new FormData();
                formData.append('participant_ref', student.id);
                formData.append('round', round);
                formData.append('uploaded_by', userId);
                
                const docBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
                formData.append('images', docBlob, 'eg.jpeg');

                const uploadRes = await fetch(`${PB_URL}/api/collections/marksheet_uploads/records`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (uploadRes.ok) {
                    console.log(`  [✓] Marksheet uploaded successfully`);
                } else {
                    console.error(`  [✗] Failed to upload marksheet:`, await uploadRes.text());
                }
            }
        } catch (err) {
            console.error(`  [✗] Error uploading marksheet:`, err);
        }
    }

    console.log('[Seeder] Final Marks and marksheets seeding completed successfully.');
}

run().catch(console.error);
