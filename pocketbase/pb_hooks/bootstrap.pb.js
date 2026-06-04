// pocketbase/pb_hooks/bootstrap.pb.js
//
// 1. BOOTSTRAP: Auto-generates default dashboard metadata records if missing.
//    Stats fields (institution_count, today_count, total_applicant) are stored
//    as plain integers (e.g. 0, 1, 42) — NOT as JSON objects.
//
// 2. CRON: Daily at 01:00 AM — recalculate all three stats inline.
// 3. ROUTE: POST /api/admin-recalculate-stats — manual trigger from admin UI.

// ── BOOTSTRAP on serve ───────────────────────────────────────────────────────
$app.onServe().bindFunc((e) => {
    const keys = [
        "total_applicant",
        "today_count",
        "institution_count",
        "time",
        "madrasa_application_status",
        "participant_application_status",
        "individual_rules",
        "institution_rules"
    ];

    try {
        const collection = $app.findCollectionByNameOrId("metadata");
        if (collection) {
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                try {
                    $app.findFirstRecordByData("metadata", "key", key);
                    // Already exists — skip
                } catch (_) {
                    try {
                        const record = new Record(collection);
                        record.set("key", key);

                        if (key === "total_applicant" || key === "today_count" || key === "institution_count") {
                            record.set("value", 0);
                        } else if (key === "time") {
                            record.set("value", JSON.stringify({ date: "2026-06-19T00:00:00" }));
                        } else if (key === "madrasa_application_status" || key === "participant_application_status") {
                            record.set("value", JSON.stringify({ status: "open" }));
                        } else if (key === "individual_rules") {
                            record.set("value", "State Level Quran Competition - Individual Participant Rules & Regulations\n\n1. Eligibility & Registration:\n   - Every candidate must register individually with correct personal information.\n   - Date of Birth must match official documents (Birth Certificate, Aadhaar, or Passport).\n   - Any discrepancy in DOB will result in disqualification.\n\n2. Category Specifications & Age Limits:\n   - 5 Juz Category: Maximum age allowed is 15 years.\n   - 15 Juz Category: Maximum age allowed is 19 years.\n   - 30 Juz Category: Maximum age allowed is 25 years.\n   - Age calculation is based on the day of the competition (with configured tolerance buffer).\n\n3. Code of Conduct:\n   - Participants must dress in modest, formal traditional attire.\n   - Reporting time at the venue must be strictly followed.\n   - The decision of the judging panel is final and binding.");
                        } else if (key === "institution_rules") {
                            record.set("value", "State Level Quran Competition - Institution Rules & Regulations\n\n1. Registration & Verification:\n   - Madrasas, Islamic Schools, and organizations must register as an Institution first.\n   - The institution coordinator is responsible for registering candidates under their account.\n   - Valid proof of institution registration or authorization letter must be uploaded.\n\n2. Application Submission:\n   - Group submissions of candidates must adhere to individual age and category criteria.\n   - All details must be verified by the head of the institution prior to final submission.\n   - The institution code/ID must be shared only with authorized candidates.\n\n3. Coordination:\n   - The coordinator must represent the candidates during venue verification and reporting.\n   - Accommodation requests must be submitted in advance.");
                        }

                        $app.save(record);
                        console.log("Created default metadata record for key: " + key);
                    } catch (createErr) {
                        console.error("Failed to create default metadata key " + key + ": " + createErr);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to check/create metadata records: " + err);
    }

    return e.next();
});

// ── CRON: Every day at 01:00 AM — inline recalculation ──────────────────────
cronAdd("recalculateDailyStats", "0 1 * * *", () => {
    console.log("Cron: running daily stats recalculation at 01:00 AM");

    try {
        const allParticipants = $app.findRecordsByFilter("participants_application", "id != ''", "", 9999999, 0);
        const totalCount = allParticipants ? allParticipants.length : 0;

        const todayStr = new Date().toISOString().split("T")[0];
        const todayRecords = $app.findRecordsByFilter(
            "participants_application",
            "created >= {:today}",
            "",
            9999999,
            0,
            { today: todayStr + " 00:00:00.000Z" }
        );
        const todayCount = todayRecords ? todayRecords.length : 0;

        const allInsts = $app.findRecordsByFilter("institutions", "id != ''", "", 9999999, 0);
        const instCount = allInsts ? allInsts.length : 0;

        const metaCollection = $app.findCollectionByNameOrId("metadata");

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "total_applicant");
            r.set("value", totalCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "total_applicant");
            r.set("value", totalCount);
            $app.save(r);
        }

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "today_count");
            r.set("value", todayCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "today_count");
            r.set("value", todayCount);
            $app.save(r);
        }

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
            r.set("value", instCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "institution_count");
            r.set("value", instCount);
            $app.save(r);
        }

        console.log("Cron stats done — total:" + totalCount + " today:" + todayCount + " institutions:" + instCount);
    } catch (err) {
        console.error("Cron recalculate error: " + err);
    }
});

// ── CUSTOM ROUTE: POST /api/admin-recalculate-stats ─────────────────────────
// Allows the admin dashboard to manually trigger stats recalculation.
routerAdd("POST", "/api/admin-recalculate-stats", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const allParticipants = $app.findRecordsByFilter("participants_application", "id != ''", "", 9999999, 0);
        const totalCount = allParticipants ? allParticipants.length : 0;

        const todayStr = new Date().toISOString().split("T")[0];
        const todayRecords = $app.findRecordsByFilter(
            "participants_application",
            "created >= {:today}",
            "",
            9999999,
            0,
            { today: todayStr + " 00:00:00.000Z" }
        );
        const todayCount = todayRecords ? todayRecords.length : 0;

        const allInsts = $app.findRecordsByFilter("institutions", "id != ''", "", 9999999, 0);
        const instCount = allInsts ? allInsts.length : 0;

        const metaCollection = $app.findCollectionByNameOrId("metadata");

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "total_applicant");
            r.set("value", totalCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "total_applicant");
            r.set("value", totalCount);
            $app.save(r);
        }

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "today_count");
            r.set("value", todayCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "today_count");
            r.set("value", todayCount);
            $app.save(r);
        }

        try {
            const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
            r.set("value", instCount);
            $app.save(r);
        } catch (_) {
            const r = new Record(metaCollection);
            r.set("key", "institution_count");
            r.set("value", instCount);
            $app.save(r);
        }

        console.log("Admin triggered stats recalc — total:" + totalCount + " today:" + todayCount + " institutions:" + instCount);
        return e.json(200, { success: true, total_applicant: totalCount, today_count: todayCount, institution_count: instCount });
    } catch (err) {
        console.error("Admin recalculate route error: " + err);
        return e.json(500, { error: "Recalculation failed: " + err });
    }
});
