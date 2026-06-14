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

// ── 8. Admin print venue list ────────────────────────────────────────────────
routerAdd("GET", "/api/admin/print-venue-list", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const venue = (info.query.venue || "").trim();
    const slot = (info.query.slot || "").trim();

    if (!venue) {
        return e.json(400, { error: "Missing venue parameter" });
    }

    try {
        let filter = "status = 'approved' && allocated_venue = {:venue}";
        const params = { venue: venue };

        if (slot && slot !== "all") {
            // Match slot exactly or by prefix
            filter += " && (allocated_slot = {:slot} || allocated_slot ~ {:slotPrefix})";
            params.slot = slot;
            // Clean up the slot name if it has time in brackets
            params.slotPrefix = slot.split(" (")[0].trim();
        }

        const records = $app.findRecordsByFilter("participants_application", filter, "full_name", 2000, 0, params);
        const list = [];

        records.forEach(record => {
            let expandedInst = null;
            const instRef = record.get("institution_ref");
            if (instRef) {
                try {
                    expandedInst = $app.findRecordById("institutions", instRef);
                } catch (_) {}
            }

            list.push({
                id: record.get("id"),
                participant_id: record.get("participant_id"),
                full_name: record.get("full_name"),
                father_name: record.get("father_name"),
                guardian_name: record.get("guardian_name"),
                category: record.get("category"),
                juzz_options: record.get("juzz_options"),
                selected_juz: record.get("selected_juz"),
                allocated_venue: record.get("allocated_venue"),
                allocated_slot: record.get("allocated_slot"),
                whatsapp_number: record.get("whatsapp_number"),
                guardian_phone: record.get("guardian_phone"),
                candidate_photo: record.get("candidate_photo"),
                collectionId: record.collection().id,
                collectionName: record.collection().name,
                expand: {
                    institution_ref: expandedInst ? {
                        name: expandedInst.get("name")
                    } : null
                }
            });
        });

        return e.json(200, list);
    } catch (err) {
        return e.json(500, { error: "Failed to get venue participants: " + err });
    }
});

// ── 9. Admin generate ID cards list ──────────────────────────────────────────
routerAdd("GET", "/api/admin/generate-ids", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const venue = (info.query.venue || "").trim();
    const slot = (info.query.slot || "").trim();

    if (!venue) {
        return e.json(400, { error: "Missing venue parameter" });
    }

    try {
        let filter = "status = 'approved' && allocated_venue = {:venue}";
        const params = { venue: venue };

        if (slot && slot !== "all") {
            filter += " && (allocated_slot = {:slot} || allocated_slot ~ {:slotPrefix})";
            params.slot = slot;
            params.slotPrefix = slot.split(" (")[0].trim();
        }

        const records = $app.findRecordsByFilter("participants_application", filter, "full_name", 2000, 0, params);
        const list = [];

        records.forEach(record => {
            let expandedInst = null;
            const instRef = record.get("institution_ref");
            if (instRef) {
                try {
                    expandedInst = $app.findRecordById("institutions", instRef);
                } catch (_) {}
            }

            list.push({
                id: record.get("id"),
                participant_id: record.get("participant_id"),
                full_name: record.get("full_name"),
                father_name: record.get("father_name"),
                guardian_name: record.get("guardian_name"),
                category: record.get("category"),
                juzz_options: record.get("juzz_options"),
                selected_juz: record.get("selected_juz"),
                allocated_venue: record.get("allocated_venue"),
                allocated_slot: record.get("allocated_slot"),
                whatsapp_number: record.get("whatsapp_number"),
                guardian_phone: record.get("guardian_phone"),
                candidate_photo: record.get("candidate_photo"),
                collectionId: record.collection().id,
                collectionName: record.collection().name,
                expand: {
                    institution_ref: expandedInst ? {
                        name: expandedInst.get("name")
                    } : null
                }
            });
        });

        return e.json(200, list);
    } catch (err) {
        return e.json(500, { error: "Failed to get venue participants for ID: " + err });
    }
});
