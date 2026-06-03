// pocketbase/pb_hooks/participants.pb.js
//
// Hooks for the "participants_application" collection.
//
// ID generation strategy:
//   - When an admin sets status → "approved", generate a sequential APL-XXNNNNNN id
//     and persist it via a follow-up $app.save() AFTER the current save succeeds.
//
// Stats update:
//   - After a successful create or delete, recalculate total_applicant and today_count
//     inline (no shared functions) to avoid goja scope issues.

// ── After a record is successfully updated ───────────────────────────────────
// Only assign participant_id when status just became "approved" and no id yet.
onRecordAfterUpdateSuccess((e) => {
    try {
        const record = e.record;
        const status = record.get("status");
        const currentId = record.get("participant_id");

        if (status === "approved" && !currentId) {
            const cat = record.get("category");
            let juzPrefix = "05";
            if (cat === "15_juz") juzPrefix = "15";
            if (cat === "30_juz") juzPrefix = "30";

            let nextNum = 1;
            try {
                const lastRecords = $app.findRecordsByFilter(
                    "participants_application",
                    "category = {:cat} && participant_id != ''",
                    "-participant_id",
                    1,
                    0,
                    { cat: cat }
                );
                if (lastRecords && lastRecords.length > 0) {
                    const lastId = lastRecords[0].get("participant_id");
                    const numPart = lastId.substring(6);
                    const parsed = parseInt(numPart, 10);
                    if (!isNaN(parsed)) nextNum = parsed + 1;
                }
            } catch (_) { }

            const padded = ("0000" + nextNum).slice(-5);
            const newParticipantId = "APL-" + juzPrefix + padded;

            record.set("participant_id", newParticipantId);
            $app.save(record);
        } else if (status !== "approved" && currentId) {
            record.set("participant_id", "");
            $app.save(record);
        }
    } catch (err) {
        console.error("participants: failed to assign/clear participant_id: " + err);
    }
}, "participants_application");

// ── After a record is successfully created ───────────────────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        // ── Inline stats recalculation (no shared function) ──
        const allRecords = $app.findRecordsByFilter("participants_application", "id != ''", "", 9999999, 0);
        const totalCount = allRecords ? allRecords.length : 0;

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

        try {
            const totalMeta = $app.findFirstRecordByData("metadata", "key", "total_applicant");
            totalMeta.set("value", totalCount);
            $app.save(totalMeta);
        } catch (_) { }

        try {
            const todayMeta = $app.findFirstRecordByData("metadata", "key", "today_count");
            todayMeta.set("value", todayCount);
            $app.save(todayMeta);
        } catch (_) { }

        // ── Enqueue Confirmation Email ──
        const email = e.record.get("email");
        if (email) {
            const fullName = e.record.get("full_name");
            const appId = e.record.get("id");
            const category = e.record.get("category");

            const appUrl = "https://al-azhar.duckdns.org/slqc";
            const trackUrl = `${appUrl}/track?type=individual&query=${appId}`;

            const htmlBody = `
                <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>Your Quran Competition Application Received</h2>
                    <p>Dear ${fullName},</p>
                    <p>Your application for the Quran Competition (Category: ${category}) has been received successfully.</p>
                    <p><strong>Your Application ID:</strong> ${appId}</p>
                    <p>You can track the status of your application using the link below (you will also need your Date of Birth):</p>
                    <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Application Status</a></p>
                    <p>Thank you,<br/>SLQC 2026 Team</p>
                </div>
            `;

            const mailCollection = $app.findCollectionByNameOrId("mail_queue");
            const mailRecord = new Record(mailCollection);
            mailRecord.set("to_email", email);
            mailRecord.set("to_name", fullName);
            mailRecord.set("subject", `Your Quran Competition Application Received – ${appId}`);
            mailRecord.set("body_html", htmlBody);
            mailRecord.set("type", "individual_confirmation");
            mailRecord.set("status", "pending");
            mailRecord.set("attempts", 0);
            mailRecord.set("record_id", appId);

            $app.save(mailRecord);
        }
    } catch (err) {
        console.error("participants after create error: " + err);
    }
}, "participants_application");

// ── After a record is successfully deleted ───────────────────────────────────
onRecordAfterDeleteSuccess((e) => {
    try {
        // ── Inline stats recalculation (no shared function) ──
        const allRecords = $app.findRecordsByFilter("participants_application", "id != ''", "", 9999999, 0);
        const totalCount = allRecords ? allRecords.length : 0;

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

        try {
            const totalMeta = $app.findFirstRecordByData("metadata", "key", "total_applicant");
            totalMeta.set("value", totalCount);
            $app.save(totalMeta);
        } catch (_) { }

        try {
            const todayMeta = $app.findFirstRecordByData("metadata", "key", "today_count");
            todayMeta.set("value", todayCount);
            $app.save(todayMeta);
        } catch (_) { }
    } catch (err) {
        console.error("participants: failed to update stats after delete: " + err);
    }
}, "participants_application");
