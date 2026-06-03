// pocketbase/pb_hooks/institutions.pb.js
//
// Hooks for the "institutions" collection.
//
// ID generation strategy:
//   - When an admin sets status → "approved", generate a unique INST-XXXXXX id
//     and persist it via a follow-up $app.save() AFTER the current save succeeds.
//
// Stats update:
//   - After a successful create or delete, recalculate institution_count inline
//     (no shared functions) to avoid goja scope issues.

// ── After a record is successfully updated ───────────────────────────────────
// Only assign institution_id when status just became "approved" and no id yet.
onRecordAfterUpdateSuccess((e) => {
    try {
        const record = e.record;
        const status = record.get("status");
        const currentId = record.get("institution_id");

        if (status === "approved" && !currentId) {
            const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
            let newId = "";
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 10) {
                let code = "";
                for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                newId = "INST-" + code;
                attempts++;

                try {
                    const existing = $app.findRecordsByFilter(
                        "institutions",
                        "institution_id = {:id}",
                        "",
                        1,
                        0,
                        { id: newId }
                    );
                    if (!existing || existing.length === 0) {
                        isUnique = true;
                    }
                } catch (_) {
                    isUnique = true;
                }
            }

            if (newId) {
                record.set("institution_id", newId);
                $app.save(record);
            }
        } else if (status !== "approved" && currentId) {
            record.set("institution_id", "");
            $app.save(record);
        }
        
        // ── Enqueue Confirmation Email on Email Update (Spelling Correction) ──
        const original = record.original();
        const originalEmail = original ? original.get("email") : "";
        const newEmail = record.get("email");
        if (newEmail && newEmail !== originalEmail) {
            const instName = record.get("name");
            const appId = record.get("id");
            const passcode = record.get("passcode");

            const appUrl = "https://al-azhar.duckdns.org/slqc";
            const trackUrl = `${appUrl}/track?type=institution&query=${appId}`;

            const htmlBody = `
                <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>Institution Registration Received – SLQC 2026</h2>
                    <p>Dear ${instName},</p>
                    <p>Your institution's registration for the Quran Competition has been received successfully.</p>
                    <p><strong>Institution Auto-ID (for internal tracking):</strong> ${appId}</p>
                    <p><strong>Your Passcode:</strong> ${passcode}</p>
                    <p>Please keep this passcode secure. You will need it to track your status, submit candidates, and manage your registration.</p>
                    <p>You can track the status of your registration using the link below:</p>
                    <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Institution Status</a></p>
                    <p>Thank you,<br/>SLQC 2026 Team</p>
                </div>
            `;

            const mailCollection = $app.findCollectionByNameOrId("mail_queue");
            const mailRecord = new Record(mailCollection);
            mailRecord.set("to_email", newEmail);
            mailRecord.set("to_name", instName);
            mailRecord.set("subject", `Institution Registration Received – SLQC 2026`);
            mailRecord.set("body_html", htmlBody);
            mailRecord.set("type", "institution_confirmation");
            mailRecord.set("status", "pending");
            mailRecord.set("attempts", 0);
            mailRecord.set("record_id", appId);

            $app.save(mailRecord);
        }
    } catch (err) {
        console.error("institutions: failed to assign/clear institution_id or send email on update: " + err);
    }
}, "institutions");

// ── After a record is successfully created ───────────────────────────────────
onRecordAfterCreateSuccess((e) => {
    try {
        // ── Inline institution_count recalculation (no shared function) ──
        const allInsts = $app.findRecordsByFilter("institutions", "id != ''", "", 9999999, 0);
        const count = allInsts ? allInsts.length : 0;

        try {
            const instRecord = $app.findFirstRecordByData("metadata", "key", "institution_count");
            instRecord.set("value", count);
            $app.save(instRecord);
        } catch (_) { }

        // ── Enqueue Confirmation Email ──
        const email = e.record.get("email");
        if (email) {
            const instName = e.record.get("name");
            const appId = e.record.get("id");
            const passcode = e.record.get("passcode");

            const appUrl = "https://al-azhar.duckdns.org/slqc";
            const trackUrl = `${appUrl}/track?type=institution&query=${appId}`;

            const htmlBody = `
                <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                    <h2>Institution Registration Received – SLQC 2026</h2>
                    <p>Dear ${instName},</p>
                    <p>Your institution's registration for the Quran Competition has been received successfully.</p>
                    <p><strong>Institution Auto-ID (for internal tracking):</strong> ${appId}</p>
                    <p><strong>Your Passcode:</strong> ${passcode}</p>
                    <p>Please keep this passcode secure. You will need it to track your status, submit candidates, and manage your registration.</p>
                    <p>You can track the status of your registration using the link below:</p>
                    <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Institution Status</a></p>
                    <p>Thank you,<br/>SLQC 2026 Team</p>
                </div>
            `;

            const mailCollection = $app.findCollectionByNameOrId("mail_queue");
            const mailRecord = new Record(mailCollection);
            mailRecord.set("to_email", email);
            mailRecord.set("to_name", instName);
            mailRecord.set("subject", `Institution Registration Received – SLQC 2026`);
            mailRecord.set("body_html", htmlBody);
            mailRecord.set("type", "institution_confirmation");
            mailRecord.set("status", "pending");
            mailRecord.set("attempts", 0);
            mailRecord.set("record_id", appId);

            $app.save(mailRecord);
        }
    } catch (err) {
        console.error("institutions: failed in after create hook: " + err);
    }
}, "institutions");

// ── After a record is successfully deleted ───────────────────────────────────
onRecordAfterDeleteSuccess((e) => {
    try {
        // ── Inline institution_count recalculation (no shared function) ──
        const allInsts = $app.findRecordsByFilter("institutions", "id != ''", "", 9999999, 0);
        const count = allInsts ? allInsts.length : 0;

        try {
            const instRecord = $app.findFirstRecordByData("metadata", "key", "institution_count");
            instRecord.set("value", count);
            $app.save(instRecord);
        } catch (_) { }
    } catch (err) {
        console.error("institutions: failed to update institution_count after delete: " + err);
    }
}, "institutions");
