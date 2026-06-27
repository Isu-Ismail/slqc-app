// pocketbase/pb_hooks/admin_api_participants.pb.js

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
        if (query.toUpperCase().indexOf("APL-") === 0 || /^\d{3,4}$/.test(query)) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "participant_id = {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) { }
        }

        // 2. Try by record ID
        if (!record && query.length === 15) {
            try {
                record = $app.findRecordById("participants_application", query);
            } catch (_) { }
        }

        // 3. Search by Aadhaar
        if (!record) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "aadhaar_number = {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) { }
        }

        // 4. Search by Name (partial match)
        if (!record) {
            try {
                const records = $app.findRecordsByFilter("participants_application", "full_name ~ {:query}", "", 1, 0, { query: query });
                if (records && records.length > 0) record = records[0];
            } catch (_) { }
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
            } catch (_) { }
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
            juz_options: record.get("juzz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            address: record.get("address") || "",
            status: record.get("status"),
            is_locked: record.get("is_locked"),
            rejection_reason: record.get("rejection_reason"),
            allocated_venue: record.get("allocated_venue"),
            allocated_order: record.get("allocated_order"),
            aadhaar_front: record.get("aadhaar_front"),
            birthcertificate_photo: record.get("birthcertificate_photo"),
            candidate_photo: record.get("candidate_photo"),
            created: record.get("created"),
            updated: record.get("updated")
        };

        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) { }
        }

        responseData.expand = {
            approved_by: expandedApprover ? {
                name: expandedApprover.get("name") || expandedApprover.get("username") || "Organising Committee",
                mobile: expandedApprover.get("mobile") || "Official Support",
                email: expandedApprover.get("email") || "support@competition.com"
            } : (record.get("status") === "approved" ? {
                name: "Organising Committee",
                mobile: "Official Support",
                email: "support@competition.com"
            } : null),
            institution_ref: expandedInst ? {
                id: expandedInst.get("id"),
                name: expandedInst.get("name"),
                institution_id: expandedInst.get("institution_id"),
                email: expandedInst.get("email"),
                phone_number: expandedInst.get("phone_number"),
                whatsapp_number: expandedInst.get("whatsapp_number"),
                address: expandedInst.get("address")
            } : null
        };

        return e.json(200, responseData);
    } catch (err) {
        return e.json(500, { error: "Failed to track individual: " + err });
    }
});

// ── 7. Secure admin print application details ───────────────────────────────




routerAdd("POST", "/api/admin/batch-arrival-status", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    let updates = null;
    try {
        const info = e.requestInfo();
        const data = info.data || {};
        updates = data.updates || null;
    } catch (_) { }

    if (!updates || !Array.isArray(updates)) {
        try {
            const body = new DynamicModel({
                updates: []
            });
            e.bindBody(body);
            updates = body.updates;
        } catch (_) { }
    }

    if (!updates || !Array.isArray(updates)) {
        return e.json(400, { error: "Invalid payload: 'updates' array is required." });
    }

    try {
        $app.runInTransaction((txApp) => {
            for (let i = 0; i < updates.length; i++) {
                const item = updates[i];
                if (!item.id || !item.arrival_status) {
                    throw new Error("Missing 'id' or 'arrival_status' in update item at index " + i);
                }
                if (item.arrival_status !== "none" && item.arrival_status !== "present" && item.arrival_status !== "absent") {
                    throw new Error("Invalid arrival_status value: " + item.arrival_status);
                }
                const record = txApp.findRecordById("participants_application", item.id);
                record.set("arrival_status", item.arrival_status);
                txApp.save(record);
            }
        });

        // Trigger collection update for real-time sync
        try {
            const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
            tr.set("random_value", $security.randomString(10));
            $app.save(tr);
        } catch (_) { }

        return e.json(200, { success: true, message: "Arrival statuses updated successfully." });
    } catch (err) {
        console.error("Batch arrival status error: " + err);
        return e.json(500, { error: "Failed to update arrival statuses: " + (err.message || err) });
    }
});
