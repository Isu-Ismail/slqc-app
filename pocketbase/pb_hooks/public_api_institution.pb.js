// pocketbase/pb_hooks/public_api_institution.pb.js

// ── 1. Track Institution submissions ────────────────────────────────────────
routerAdd("GET", "/api/public/track-institution", (e) => {
    const info = e.requestInfo();
    const query = (info.query.query || "").trim();
    const passcode = (info.query.passcode || "").trim();

    if (!query || !passcode) {
        return e.json(400, { error: "Missing query or passcode parameters" });
    }

    try {
        const upper = query.toUpperCase();
        let records = [];

        if (upper.indexOf("INST-") === 0) {
            records = $app.findRecordsByFilter(
                "institutions",
                "institution_id = {:query} && passcode = {:passcode}",
                "",
                1,
                0,
                { query: upper, passcode: passcode }
            );
        } else if (query.length === 15) {
            records = $app.findRecordsByFilter(
                "institutions",
                "id = {:query} && passcode = {:passcode}",
                "",
                1,
                0,
                { query: query, passcode: passcode }
            );
        }

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
            
            let expandedApprover = null;
            const approvedBy = app.get("approved_by");
            if (approvedBy) {
                try {
                    expandedApprover = $app.findRecordById("users", approvedBy);
                } catch (_) {}
            }

            appList.push({
                collectionId: app.collection().id,
                collectionName: app.collection().name,
                id: app.get("id"),
                participant_id: app.get("participant_id"),
                full_name: app.get("full_name"),
                father_name: app.get("father_name"),
                father_number: app.get("father_number"),
                aadhaar_number: app.get("aadhaar_number"),
                dob: app.get("dob"),
                gender: app.get("gender"),
                category: app.get("category"),
                juz_options: app.get("juzz_options"),
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
                allocated_order: app.get("allocated_order"),
                aadhaar_front: app.get("aadhaar_front"),
                birthcertificate_photo: app.get("birthcertificate_photo"),
                candidate_photo: app.get("candidate_photo"),
                created: app.get("created"),
                updated: app.get("updated"),
                expand: {
                    approved_by: expandedApprover ? {
                        name: expandedApprover.get("name") || expandedApprover.get("username") || "Organising Committee",
                        mobile: expandedApprover.get("mobile") || "Official Support",
                        email: expandedApprover.get("email") || "support@competition.com"
                    } : (app.get("status") === "approved" ? {
                        name: "Organising Committee",
                        mobile: "Official Support",
                        email: "support@competition.com"
                    } : null),
                    institution_ref: {
                        id: institution.get("id"),
                        name: institution.get("name"),
                        institution_id: institution.get("institution_id"),
                        email: institution.get("email"),
                        phone_number: institution.get("phone_number"),
                        whatsapp_number: institution.get("whatsapp_number"),
                        address: institution.get("address")
                    }
                }
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

// ── 2. Secure update institution ─────────────────────────────────────────────
routerAdd("POST", "/api/public/update-institution", (e) => {
    const body = new DynamicModel({
        id: "",
        passcode: "",
        name: "",
        address: "",
        contact_person: "",
        email: "",
        whatsapp_number: "",
        phone_number: "",
        instituition_location: ""
    });
    e.bindBody(body);

    const id = body.id;
    const passcode = body.passcode;

    if (!id || !passcode) {
        return e.json(400, { error: "Missing required parameters: id and passcode" });
    }

    try {
        const record = $app.findRecordById("institutions", id);
        if (!record) {
            return e.json(404, { error: "Institution not found" });
        }

        // Verify passcode
        if (record.get("passcode") !== passcode) {
            return e.json(403, { error: "Unauthorized. Passcode mismatch." });
        }

        // Check if locked
        if (record.get("is_locked")) {
            return e.json(400, { error: "This institution registration is locked and cannot be modified." });
        }

        // List of fields that public institutions are allowed to edit
        const editableFields = [
            "name", "address", "contact_person", "email", "whatsapp_number", "phone_number",
            "instituition_location"
        ];

        // Apply string field updates if present in data
        for (let i = 0; i < editableFields.length; i++) {
            const field = editableFields[i];
            const val = body[field];
            if (val !== undefined && val !== null && val !== "") {
                record.set(field, val);
            }
        }

        // Handle file uploads securely using findUploadedFiles if multipart body is present
        const info = e.requestInfo();
        const headers = info.headers || {};
        const contentType = headers["content-type"] || "";
        if (contentType.indexOf("multipart/form-data") !== -1) {
            const getUploadedFile = (name) => {
                try {
                    const files = e.findUploadedFiles(name);
                    if (files && files.length > 0) {
                        return files[0];
                    }
                } catch (_) {}
                return null;
            };

            const docFile = getUploadedFile("document");
            if (docFile) {
                record.set("document", docFile);
            }

            const buildingProofFile = getUploadedFile("instituition_building_proof");
            if (buildingProofFile) {
                record.set("instituition_building_proof", buildingProofFile);
            }
        }

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "institutions");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        // Fetch updated record to return
        const updated = $app.findRecordById("institutions", id);

        return e.json(200, {
            id: updated.get("id"),
            institution_id: updated.get("institution_id"),
            name: updated.get("name"),
            address: updated.get("address"),
            contact_person: updated.get("contact_person"),
            email: updated.get("email"),
            whatsapp_number: updated.get("whatsapp_number"),
            phone_number: updated.get("phone_number"),
            document: updated.get("document"),
            instituition_location: updated.get("instituition_location"),
            instituition_building_proof: updated.get("instituition_building_proof"),
            status: updated.get("status"),
            is_locked: updated.get("is_locked"),
            rejection_reason: updated.get("rejection_reason"),
            passcode: updated.get("passcode")
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update institution: " + err });
    }
});

// ── 3. Secure verify institution ─────────────────────────────────────────────
routerAdd("GET", "/api/public/verify-institution", (e) => {
    const info = e.requestInfo();
    const institutionId = (info.query.institution_id || "").trim();
    const passcode = (info.query.passcode || "").trim();

    if (!institutionId || !passcode) {
        return e.json(400, { error: "Missing required parameters: institution_id and passcode" });
    }

    try {
        const records = $app.findRecordsByFilter(
            "institutions",
            "institution_id = {:instId} && passcode = {:passcode}",
            "",
            1,
            0,
            { instId: institutionId, passcode: passcode }
        );

        if (!records || records.length === 0) {
            return e.json(404, { error: "No matching institution found with this ID and passcode." });
        }

        const record = records[0];
        let appsVal = [];
        try {
            const jsonStr = record.getString("applications");
            if (jsonStr) {
                appsVal = JSON.parse(jsonStr);
            } else {
                const rawApps = record.get("applications");
                if (rawApps) {
                    if (typeof rawApps === "string") {
                        appsVal = JSON.parse(rawApps);
                    } else if (Array.isArray(rawApps) && rawApps.length > 0 && typeof rawApps[0] === "number") {
                        appsVal = JSON.parse(String.fromCharCode.apply(null, rawApps));
                    } else {
                        appsVal = rawApps;
                    }
                }
            }
        } catch (_) {}

        return e.json(200, {
            id: record.get("id"),
            institution_id: record.get("institution_id"),
            name: record.get("name"),
            status: record.get("status"),
            applications: appsVal
        });
    } catch (err) {
        return e.json(500, { error: "Failed to verify institution: " + err });
    }
});

// ── 4. Secure delete institution application ─────────────────────────────────
routerAdd("POST", "/api/public/institution/delete-application", (e) => {
    const body = new DynamicModel({
        application_id: "",
        institution_id: "",
        passcode: ""
    });
    e.bindBody(body);

    const appId = (body.application_id || "").trim();
    const instId = (body.institution_id || "").trim();
    const passcode = (body.passcode || "").trim();

    if (!appId || !instId || !passcode) {
        return e.json(400, { error: "Missing required parameters: application_id, institution_id, and passcode" });
    }

    try {
        // 1. Verify institution credentials
        const instRecords = $app.findRecordsByFilter(
            "institutions",
            "institution_id = {:instId} && passcode = {:passcode}",
            "",
            1,
            0,
            { instId: instId, passcode: passcode }
        );

        if (!instRecords || instRecords.length === 0) {
            return e.json(403, { error: "Invalid institution credentials." });
        }

        const institution = instRecords[0];

        // 2. Fetch the application
        const application = $app.findRecordById("participants_application", appId);
        if (!application) {
            return e.json(404, { error: "Application not found." });
        }

        // 3. Verify application belongs to this institution
        if (application.get("institution_ref") !== institution.get("id")) {
            return e.json(403, { error: "Unauthorized. This application is not linked to your institution." });
        }

        // 4. Verify application status is pending or rejected
        const status = application.get("status");
        if (status === "approved") {
            return e.json(400, { error: "Cannot delete an approved application." });
        }

        // 5. Decrement category count in institution record
        const category = application.get("category");
        let appsVal = [];
        try {
            const jsonStr = institution.getString("applications");
            if (jsonStr) {
                appsVal = JSON.parse(jsonStr);
            } else {
                const rawApps = institution.get("applications");
                if (rawApps) {
                    if (typeof rawApps === "string") {
                        appsVal = JSON.parse(rawApps);
                    } else if (Array.isArray(rawApps) && rawApps.length > 0 && typeof rawApps[0] === "number") {
                        appsVal = JSON.parse(String.fromCharCode.apply(null, rawApps));
                    } else {
                        appsVal = rawApps;
                    }
                }
            }
        } catch (_) {}

        if (!Array.isArray(appsVal)) {
            appsVal = [];
        }

        // Find and decrement count
        let found = false;
        for (let i = 0; i < appsVal.length; i++) {
            if (appsVal[i] && appsVal[i].cat === category) {
                appsVal[i].count = Math.max(0, (parseInt(appsVal[i].count, 10) || 1) - 1);
                found = true;
                break;
            }
        }
        if (!found) {
            appsVal.push({ cat: category, count: 0 });
        }

        institution.set("applications", appsVal);
        $app.save(institution);

        // 6. Delete application
        $app.delete(application);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        return e.json(200, { success: true, message: "Application deleted successfully." });

    } catch (err) {
        return e.json(500, { error: "Failed to delete application: " + err });
    }
});
