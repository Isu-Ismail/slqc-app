// pocketbase/pb_hooks/admin_api.pb.js
//
// Custom routes for admin approve/reject operations to avoid double-save hooks
// that disrupt real-time syncing.


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
            } else {
                item.name = r.get("name");
                item.contact_person = r.get("contact_person");
                item.email = r.get("email");
                item.whatsapp_number = r.get("whatsapp_number");
                item.phone_number = r.get("phone_number");
                item.address = r.get("address");
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
    const recalculateStats = function($app) {
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
            } catch (_) {}

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "today_count");
                r.set("value", todayCount);
                $app.save(r);
            } catch (_) {}

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
                r.set("value", instCount);
                $app.save(r);
            } catch (_) {}
        } catch (err) {
            console.error("Failed to recalculate stats: " + err);
        }
    };

    // 1. Verify admin/superuser authorization
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
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
            } catch (_) {}

            const padded = ("0000" + nextNum).slice(-5);
            record.set("participant_id", "APL-" + juzPrefix + padded);
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
        } catch (_) {}

        // Delete lock if present
        try {
            const locks = $app.findRecordsByFilter("approval_locks", "application_id = {:id}", "", 1, 0, { id: id });
            if (locks && locks.length > 0) {
                $app.delete(locks[0]);
            }
        } catch (_) {}

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
    const recalculateStats = function($app) {
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
            } catch (_) {}

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "today_count");
                r.set("value", todayCount);
                $app.save(r);
            } catch (_) {}

            try {
                const r = $app.findFirstRecordByData("metadata", "key", "institution_count");
                r.set("value", instCount);
                $app.save(r);
            } catch (_) {}
        } catch (err) {
            console.error("Failed to recalculate stats: " + err);
        }
    };

    // Verify admin/superuser authorization
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
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

        record.set("status", "rejected");
        record.set("is_locked", false);
        record.set("approved_by", authRecord.get("id"));
        record.set("rejection_reason", rejectionReason);

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", type === "individual" ? "participants_application" : "institutions");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        // Delete lock if present
        try {
            const locks = $app.findRecordsByFilter("approval_locks", "application_id = {:id}", "", 1, 0, { id: id });
            if (locks && locks.length > 0) {
                $app.delete(locks[0]);
            }
        } catch (_) {}

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

// ── 3. Secure admin track individual ─────────────────────────────────────────
routerAdd("GET", "/api/admin/track-individual", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const query = (info.query.query || "").trim();
    if (!query) {
        return e.json(400, { error: "Missing query parameter" });
    }

    try {
        let record;
        
        // 1. Search by participant_id
        if (query.toUpperCase().indexOf("APL-") === 0) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "participant_id = {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) {}
        }
        
        // 2. Try by record ID
        if (!record && query.length === 15) {
            try {
                record = $app.findRecordById("participants_application", query);
            } catch (_) {}
        }

        // 3. Search by Aadhaar
        if (!record) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "aadhaar_number = {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) {}
        }

        // 4. Search by Name (partial match)
        if (!record) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "full_name ~ {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) {}
        }

        if (!record) {
            return e.json(404, { error: "No matching application found" });
        }

        // Expand institution
        const instRef = record.get("institution_ref");
        let expandedInst = null;
        if (instRef) {
            try {
                expandedInst = $app.findRecordById("institutions", instRef);
            } catch (_) {}
        }

        const responseData = {
            id: record.get("id"),
            participant_id: record.get("participant_id"),
            full_name: record.get("full_name"),
            father_name: record.get("father_name"),
            father_number: record.get("father_number"),
            aadhaar_number: record.get("aadhaar_number"),
            dob: record.get("dob"),
            gender: record.get("gender"),
            category: record.get("category"),
            juz_options: record.get("juz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            status: record.get("status"),
            is_locked: record.get("is_locked"),
            rejection_reason: record.get("rejection_reason"),
            allocated_venue: record.get("allocated_venue"),
            aadhaar_front: record.get("aadhaar_front"),
            birthcertificate_photo: record.get("birthcertificate_photo"),
            candidate_photo: record.get("candidate_photo"),
            created: record.get("created"),
            updated: record.get("updated")
        };

        if (expandedInst) {
            responseData.expand = {
                institution_ref: {
                    id: expandedInst.get("id"),
                    name: expandedInst.get("name"),
                    institution_id: expandedInst.get("institution_id"),
                    email: expandedInst.get("email"),
                    phone_number: expandedInst.get("phone_number"),
                    whatsapp_number: expandedInst.get("whatsapp_number"),
                    address: expandedInst.get("address")
                }
            };
        }

        return e.json(200, responseData);
    } catch (err) {
        return e.json(500, { error: "Failed to track individual: " + err });
    }
});

// ── 4. Secure admin track institution ────────────────────────────────────────
routerAdd("GET", "/api/admin/track-institution", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const query = (info.query.query || "").trim();
    if (!query) {
        return e.json(400, { error: "Missing query parameter" });
    }

    try {
        const records = $app.findRecordsByFilter(
            "institutions",
            "id = {:query} || institution_id = {:query} || email = {:query} || name ~ {:query}",
            "",
            1,
            0,
            { query: query }
        );

        if (!records || records.length === 0) {
            return e.json(404, { error: "No matching institution found" });
        }

        const institution = records[0];

        // Fetch all applications referencing this institution
        const applications = $app.findRecordsByFilter(
            "participants_application",
            "institution_ref = {:instId}",
            "-created",
            9999,
            0,
            { instId: institution.get("id") }
        );

        const appList = [];
        for (let i = 0; i < applications.length; i++) {
            const app = applications[i];
            appList.push({
                id: app.get("id"),
                participant_id: app.get("participant_id"),
                full_name: app.get("full_name"),
                father_name: app.get("father_name"),
                father_number: app.get("father_number"),
                aadhaar_number: app.get("aadhaar_number"),
                dob: app.get("dob"),
                gender: app.get("gender"),
                category: app.get("category"),
                juz_options: app.get("juz_options"),
                selected_juz: app.get("selected_juz"),
                whatsapp_number: app.get("whatsapp_number"),
                email: app.get("email"),
                guardian_name: app.get("guardian_name"),
                guardian_phone: app.get("guardian_phone"),
                requires_accommodation: app.get("requires_accommodation"),
                status: app.get("status"),
                is_locked: app.get("is_locked"),
                rejection_reason: app.get("rejection_reason"),
                allocated_venue: app.get("allocated_venue"),
                aadhaar_front: app.get("aadhaar_front"),
                birthcertificate_photo: app.get("birthcertificate_photo"),
                candidate_photo: app.get("candidate_photo"),
                created: app.get("created"),
                updated: app.get("updated")
            });
        }

        return e.json(200, {
            institution: {
                id: institution.get("id"),
                institution_id: institution.get("institution_id"),
                name: institution.get("name"),
                address: institution.get("address"),
                contact_person: institution.get("contact_person"),
                email: institution.get("email"),
                whatsapp_number: institution.get("whatsapp_number"),
                phone_number: institution.get("phone_number"),
                document: institution.get("document"),
                instituition_location: institution.get("instituition_location"),
                instituition_building_proof: institution.get("instituition_building_proof"),
                status: institution.get("status"),
                is_locked: institution.get("is_locked"),
                rejection_reason: institution.get("rejection_reason"),
                passcode: institution.get("passcode")
            },
            applications: appList
        });

    } catch (err) {
        return e.json(500, { error: "Failed to query database: " + err });
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
        } catch (_) {}

        return e.json(200, {
            success: true,
            id: record.get("id"),
            is_locked: record.get("is_locked")
        });
    } catch (err) {
        return e.json(500, { error: "Failed to toggle lock: " + err });
    }
});

// ── 6. Secure admin update metadata ──────────────────────────────────────────
routerAdd("POST", "/api/admin/update-metadata", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const body = new DynamicModel({
        key: "",
        value: "",
        clear_document: ""
    });
    e.bindBody(body);

    const key = body.key;
    const value = body.value;

    if (!key) {
        return e.json(400, { error: "Missing metadata key parameter" });
    }

    try {
        let record;
        try {
            record = $app.findFirstRecordByData("metadata", "key", key);
        } catch (_) {
            const collection = $app.findCollectionByNameOrId("metadata");
            record = new Record(collection);
            record.set("key", key);
        }

        let hasNewDocument = false;
        const info = e.requestInfo();
        const headers = info.headers || {};
        const contentType = headers["content-type"] || "";
        if (contentType.indexOf("multipart/form-data") !== -1) {
            const docFiles = e.findUploadedFiles("document");
            if (docFiles && docFiles.length > 0) {
                record.set("document", docFiles[0]);
                hasNewDocument = true;
                if (key.indexOf("_rules") !== -1 || key === "dos_and_donts" || key === "venue_map") {
                    record.set("value", "");
                }
            }
        }

        if (!hasNewDocument) {
            record.set("value", value);
            if (body.clear_document === "true" || body.clear_document === true) {
                record.set("document", null);
            }
        }

        $app.save(record);

        return e.json(200, {
            id: record.get("id"),
            key: record.get("key"),
            value: record.get("value"),
            document: record.get("document"),
            created: record.get("created"),
            updated: record.get("updated")
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update metadata: " + err });
    }
});

// ── 7. Secure admin print application details ───────────────────────────────
routerAdd("GET", "/api/admin/print-form", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const id = (info.query.id || "").trim();

    if (!id) {
        return e.json(400, { error: "Missing required parameter: id" });
    }

    try {
        const record = $app.findRecordById("participants_application", id);
        if (!record) {
            return e.json(404, { error: "Record not found" });
        }

        if (record.get("status") !== "approved") {
            return e.json(400, { error: "Application is not approved." });
        }

        // Expand approved_by
        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) {}
        }

        // Expand institution_ref
        let expandedInst = null;
        const instRef = record.get("institution_ref");
        if (instRef) {
            try {
                expandedInst = $app.findRecordById("institutions", instRef);
            } catch (_) {}
        }

        const data = {
            collectionId: record.collection().id,
            collectionName: record.collection().name,
            id: record.get("id"),
            participant_id: record.get("participant_id"),
            full_name: record.get("full_name"),
            father_name: record.get("father_name"),
            father_number: record.get("father_number"),
            aadhaar_number: record.get("aadhaar_number"),
            dob: record.get("dob"),
            gender: record.get("gender"),
            category: record.get("category"),
            juz_options: record.get("juz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            status: record.get("status"),
            registration_type: record.get("registration_type") || "individual",
            candidate_photo: record.get("candidate_photo"),
            created: record.get("created"),
            expand: {
                approved_by: expandedApprover ? {
                    name: expandedApprover.get("name") || expandedApprover.get("username") || "Organising Committee",
                    mobile: expandedApprover.get("mobile") || "Official Support",
                    email: expandedApprover.get("email") || "support@competition.com"
                } : null,
                institution_ref: expandedInst ? {
                    name: expandedInst.get("name"),
                    institution_id: expandedInst.get("institution_id"),
                    email: expandedInst.get("email"),
                    phone_number: expandedInst.get("phone_number") || expandedInst.get("whatsapp_number") || "N/A",
                    address: expandedInst.get("address")
                } : null
            }
        };

        return e.json(200, data);

    } catch (err) {
        return e.json(500, { error: "Failed to retrieve print details: " + err });
    }
});
