// pocketbase/pb_hooks/admin_api_approvals.pb.js

// ── 0. Pending Approvals with Locks List Endpoint ────────────────────────────
routerAdd("GET", "/api/admin/pending-approvals", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const type = info.query.type; // 'individual' or 'institution'
    if (type !== "individual" && type !== "institution") {
        return e.json(400, { error: "Invalid type parameter" });
    }

    const collectionName = type === "individual" ? "participants_application" : "institutions";

    try {
        // Fetch all pending/reapplied applications/institutions
        const records = $app.findRecordsByFilter(
            collectionName,
            "status = 'pending' || status = 'reapplied'",
            "-created",
            9999,
            0
        );

        // Fetch all locks
        const locks = $app.findRecordsByFilter("approval_locks", "id != ''", "", 9999, 0);
        const lockMap = {};
        for (let i = 0; i < locks.length; i++) {
            const lock = locks[i];
            lockMap[lock.get("application_id")] = {
                id: lock.get("id"),
                locked_by: lock.get("locked_by"),
                locked_by_name: lock.get("locked_by_name"),
                created: lock.get("created")
            };
        }

        const list = [];
        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const recId = r.get("id");
            const lockInfo = lockMap[recId] || null;

            const item = {
                id: recId,
                status: r.get("status"),
                created: r.get("created"),
                updated: r.get("updated"),
                lock_info: lockInfo
            };

            if (type === "individual") {
                item.full_name = r.get("full_name");
                item.category = r.get("category");
                item.selected_juz = r.get("selected_juz");
                item.gender = r.get("gender");
                item.dob = r.get("dob");
                item.aadhaar_number = r.get("aadhaar_number");
                item.whatsapp_number = r.get("whatsapp_number");
                item.email = r.get("email");
                item.father_name = r.get("father_name");
                item.guardian_name = r.get("guardian_name");
                item.requires_accommodation = r.get("requires_accommodation");
                item.institution_ref = r.get("institution_ref");
            } else {
                item.name = r.get("name");
                item.contact_person = r.get("contact_person");
                item.email = r.get("email");
                item.whatsapp_number = r.get("whatsapp_number");
                item.phone_number = r.get("phone_number");
                item.street_address = r.get("street_address");
                item.pincode = r.get("pincode");
                item.state_name = r.get("state_name");
                item.district_name = r.get("district_name");
                item.village_name = r.get("village_name");
            }

            list.push(item);
        }

        return e.json(200, list);
    } catch (err) {
        console.error("Pending approvals query error: " + err);
        return e.json(500, { error: "Failed to fetch pending approvals: " + err });
    }
});

// ── 1. Admin Approve Endpoint ────────────────────────────────────────────────
routerAdd("POST", "/api/admin/approve", (e) => {
    const recalculateStats = function ($app) {
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

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "total_applicant");
                r.set("value", totalCount);
                $app.save(r);
            } catch (_) { }

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "today_count");
                r.set("value", todayCount);
                $app.save(r);
            } catch (_) { }

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
                r.set("value", instCount);
                $app.save(r);
            } catch (_) { }
        } catch (err) {
            console.error("Failed to recalculate stats: " + err);
        }
    };

    // 1. Verify authorization
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const body = new DynamicModel({
        id: "",
        type: "" // 'individual' or 'institution'
    });
    e.bindBody(body);

    const id = body.id;
    const type = body.type;

    if (!id || (type !== "individual" && type !== "institution")) {
        return e.json(400, { error: "Invalid payload parameters" });
    }

    const collectionName = type === "individual" ? "participants_application" : "institutions";

    try {
        const record = $app.findRecordById(collectionName, id);
        if (!record) {
            return e.json(404, { error: "Application record not found" });
        }

        // Set status and basic fields
        record.set("status", "approved");
        record.set("is_locked", true);
        record.set("approved_by", authRecord.get("id"));
        record.set("rejection_reason", "");

        // Generate sequential participant ID
        if (type === "individual" && !record.get("participant_id")) {
            const cat = record.get("category");
            let startId = 501;
            if (cat === "15_juz") startId = 1501;
            if (cat === "30_juz") startId = 3001;

            let nextNum = startId;
            try {
                const activeRecords = $app.findRecordsByFilter(
                    "participants_application",
                    "category = {:cat} && participant_id != ''",
                    "",
                    9999,
                    0,
                    { cat: cat }
                );

                let maxId = startId - 1;
                for (let i = 0; i < activeRecords.length; i++) {
                    const pidStr = activeRecords[i].get("participant_id");
                    let val = parseInt(pidStr, 10);
                    if (isNaN(val) && pidStr.startsWith("APL-")) {
                        const lastPart = pidStr.substring(6);
                        val = parseInt(lastPart, 10);
                    }
                    if (!isNaN(val)) {
                        if (cat === "5_juz" && val >= 501 && val < 600) {
                            if (val > maxId) maxId = val;
                        } else if (cat === "15_juz" && val >= 1501 && val < 3000) {
                            if (val > maxId) maxId = val;
                        } else if (cat === "30_juz" && val >= 3001) {
                            if (val > maxId) maxId = val;
                        }
                    }
                }
                nextNum = maxId + 1;
            } catch (err) {
                console.error("Error finding next participant_id: " + err);
            }

            record.set("participant_id", String(nextNum));
        }

        // Generate unique institution ID
        if (type === "institution" && !record.get("institution_id")) {
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
            }
        }

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", type === "individual" ? "participants_application" : "institutions");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) { }

        // Delete lock if present
        try {
            const locks = $app.findRecordsByFilter("approval_locks", "application_id = {:id}", "", 1, 0, { id: id });
            if (locks && locks.length > 0) {
                $app.delete(locks[0]);
            }
        } catch (_) { }

        // Enqueue approval confirmation email
        const email = record.get("email");
        if (email) {
            const mailCollection = $app.findCollectionByNameOrId("mail_queue");
            const mailRecord = new Record(mailCollection);
            mailRecord.set("to_email", email);
            mailRecord.set("status", "pending");
            mailRecord.set("attempts", 0);
            mailRecord.set("record_id", id);

            if (type === "individual") {
                const fullName = record.get("full_name");
                const partId = record.get("participant_id");
                const category = record.get("category");
                const trackUrl = `https://al-azhar.duckdns.org/slqc/track?type=individual&query=${id}`;

                mailRecord.set("to_name", fullName);
                mailRecord.set("subject", `Application Approved – SLQC 2026 | ID: ${partId}`);
                mailRecord.set("type", "individual_confirmation");
                mailRecord.set("body_html", `
                    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                        <h2>Application Approved – SLQC 2026</h2>
                        <p>Dear ${fullName},</p>
                        <p>Congratulations! Your application for the SLQC Quran Competition (Category: ${category}) has been <strong>approved</strong>.</p>
                        <p><strong>Your Participant ID:</strong> ${partId}</p>
                        <p>You can track the status of your application using the link below (you will also need your Date of Birth):</p>
                        <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Application Status</a></p>
                        <p>Thank you,<br/>SLQC 2026 Team</p>
                    </div>
                `);
            } else {
                const name = record.get("name");
                const instId = record.get("institution_id");
                const passcode = record.get("passcode") || "";
                const trackUrl = `https://al-azhar.duckdns.org/slqc/track?type=institution&query=${id}`;

                mailRecord.set("to_name", name);
                mailRecord.set("subject", `Institution Approved – SLQC 2026 | ID: ${instId}`);
                mailRecord.set("type", "institution_confirmation");
                mailRecord.set("body_html", `
                    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                        <h2>Institution Approved – SLQC 2026</h2>
                        <p>Dear ${name},</p>
                        <p>Congratulations! Your institution's registration for the SLQC Quran Competition has been <strong>approved</strong>.</p>
                        <p><strong>Institution ID:</strong> ${instId}</p>
                        <p><strong>Your Passcode:</strong> ${passcode}</p>
                        <p>Please keep this passcode secure. You will need it to track your status, submit candidates, and manage your registration.</p>
                        <p>You can track the status of your registration using the link below:</p>
                        <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Institution Status</a></p>
                        <p>Thank you,<br/>SLQC 2026 Team</p>
                    </div>
                `);
            }
            $app.save(mailRecord);
        }

        recalculateStats($app);

        return e.json(200, {
            success: true,
            id: record.get("id"),
            status: record.get("status"),
            participant_id: record.get("participant_id"),
            institution_id: record.get("institution_id")
        });

    } catch (err) {
        console.error("Approve API error: " + err);
        return e.json(500, { error: "Failed to approve record: " + err });
    }
});

// ── 2. Admin Reject Endpoint ─────────────────────────────────────────────────
routerAdd("POST", "/api/admin/reject", (e) => {
    const recalculateStats = function ($app) {
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

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "total_applicant");
                r.set("value", totalCount);
                $app.save(r);
            } catch (_) { }

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "today_count");
                r.set("value", todayCount);
                $app.save(r);
            } catch (_) { }

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
                r.set("value", instCount);
                $app.save(r);
            } catch (_) { }
        } catch (err) {
            console.error("Failed to recalculate stats: " + err);
        }
    };

    // Verify authorization
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const body = new DynamicModel({
        id: "",
        type: "", // 'individual' or 'institution'
        rejection_reason: ""
    });
    e.bindBody(body);

    const id = body.id;
    const type = body.type;
    const rejectionReason = body.rejection_reason;

    if (!id || (type !== "individual" && type !== "institution") || !rejectionReason) {
        return e.json(400, { error: "Invalid payload parameters" });
    }

    const collectionName = type === "individual" ? "participants_application" : "institutions";

    try {
        const record = $app.findRecordById(collectionName, id);
        if (!record) {
            return e.json(404, { error: "Record not found" });
        }

        if (type === "institution") {
            const acceptedParticipants = $app.findRecordsByFilter(
                "participants_application",
                "institution_ref = {:instId} && status = 'approved'",
                "",
                1,
                0,
                { instId: id }
            );
            if (acceptedParticipants && acceptedParticipants.length > 0) {
                return e.json(400, { error: "This institution cannot be rejected because there are already approved participants registered under it." });
            }
        }

        if (type === "individual") {
            const allocatedVenue = record.get("allocated_venue");
            const finalVenue = record.get("final_venue");
            if ((allocatedVenue && allocatedVenue !== "") || (finalVenue && finalVenue !== "")) {
                return e.json(400, { error: "This student cannot be rejected because a venue has already been allocated." });
            }
        }

        record.set("status", "rejected");
        record.set("is_locked", false);
        record.set("approved_by", authRecord.get("id"));
        record.set("rejection_reason", rejectionReason);

        if (type === "institution") {
            record.set("institution_id", "");
        } else if (type === "individual") {
            record.set("participant_id", "");
        }

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", type === "individual" ? "participants_application" : "institutions");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) { }

        // Delete lock if present
        try {
            const locks = $app.findRecordsByFilter("approval_locks", "application_id = {:id}", "", 1, 0, { id: id });
            if (locks && locks.length > 0) {
                $app.delete(locks[0]);
            }
        } catch (_) { }

        // Enqueue rejection email
        const email = record.get("email");
        if (email) {
            const mailCollection = $app.findCollectionByNameOrId("mail_queue");
            const mailRecord = new Record(mailCollection);
            mailRecord.set("to_email", email);
            mailRecord.set("status", "pending");
            mailRecord.set("attempts", 0);
            mailRecord.set("record_id", id);

            if (type === "individual") {
                const fullName = record.get("full_name");
                const category = record.get("category");
                const trackUrl = `https://al-azhar.duckdns.org/slqc/track?type=individual&query=${id}`;

                mailRecord.set("to_name", fullName);
                mailRecord.set("subject", `Regarding Your SLQC 2026 Application – Important Update`);
                mailRecord.set("type", "individual_rejection");
                mailRecord.set("body_html", `
                    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                        <h2>Application Status Update – SLQC 2026</h2>
                        <p>Dear ${fullName},</p>
                        <p>Thank you sincerely for taking the time to apply for the SLQC 2026 Quran Competition (Category: ${category}).</p>
                        <p>We regret to inform you that, after careful review, we are <strong>unable to approve</strong> your application at this time.</p>
                        <p><strong>Reason:</strong> ${rejectionReason}</p>
                        <p>We understand this may be disappointing, and we truly appreciate your enthusiasm and dedication. We encourage you to address the above concern and consider reapplying in a future registration window.</p>
                        <p>You can still check the status of your application using the link below:</p>
                        <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 5px;">View Application Status</a></p>
                        <p>If you have any questions, please do not hesitate to reach out to us.</p>
                        <p>Warm regards,<br/>SLQC 2026 Team</p>
                    </div>
                `);
            } else {
                const name = record.get("name");
                const trackUrl = `https://al-azhar.duckdns.org/slqc/track?type=institution&query=${id}`;

                mailRecord.set("to_name", name);
                mailRecord.set("subject", `Regarding Your SLQC 2026 Institution Registration – Important Update`);
                mailRecord.set("type", "institution_rejection");
                mailRecord.set("body_html", `
                    <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                        <h2>Institution Registration Status Update – SLQC 2026</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for submitting your institution's registration for the SLQC 2026 Quran Competition.</p>
                        <p>After careful review by our team, we regret to inform you that we are <strong>unable to approve</strong> your registration at this time.</p>
                        <p><strong>Reason:</strong> ${rejectionReason}</p>
                        <p>We sincerely appreciate your interest and the effort put into this application. We encourage you to address the concern noted above and consider reapplying during the next registration period.</p>
                        <p>You may check the current status of your registration using the link below:</p>
                        <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 5px;">View Registration Status</a></p>
                        <p>Should you have any questions or require clarification, please feel free to contact us.</p>
                        <p>Warm regards,<br/>SLQC 2026 Team</p>
                    </div>
                `);
            }
            $app.save(mailRecord);
        }

        recalculateStats($app);

        return e.json(200, {
            success: true,
            id: record.get("id"),
            status: record.get("status")
        });

    } catch (err) {
        console.error("Reject API error: " + err);
        return e.json(500, { error: "Failed to reject record: " + err });
    }
});

// ── 5. Secure admin toggle lock ──────────────────────────────────────────────
routerAdd("POST", "/api/admin/toggle-lock", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const body = new DynamicModel({
        id: "",
        type: "", // 'individual' or 'institution'
        is_locked: false
    });
    e.bindBody(body);

    const id = body.id;
    const type = body.type;
    const isLocked = body.is_locked;

    if (!id || (type !== "individual" && type !== "institution")) {
        return e.json(400, { error: "Invalid payload parameters" });
    }

    const collectionName = type === "individual" ? "participants_application" : "institutions";

    try {
        const record = $app.findRecordById(collectionName, id);
        if (!record) {
            return e.json(404, { error: "Record not found" });
        }

        if (type === "individual" && !isLocked) {
            const allocatedVenue = record.get("allocated_venue") || "";
            const finalVenue = record.get("final_venue") || "";
            if (allocatedVenue !== "" || finalVenue !== "") {
                return e.json(400, { error: "This application cannot be unlocked because a venue has already been allocated." });
            }
        }

        record.set("is_locked", isLocked);
        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", type === "individual" ? "participants_application" : "institutions");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) { }

        return e.json(200, {
            success: true,
            id: record.get("id"),
            is_locked: record.get("is_locked")
        });
    } catch (err) {
        return e.json(500, { error: "Failed to toggle lock: " + err });
    }
});
