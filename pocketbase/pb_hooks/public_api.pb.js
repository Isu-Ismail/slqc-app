// pocketbase/pb_hooks/public_api.pb.js
//
// Premade, secure public APIs for viewing and editing participant/institution data
// so client/user side does not query the database collections directly.

// ── 1. Secure track individual application ───────────────────────────────────
routerAdd("GET", "/api/public/track-individual", (e) => {
    const info = e.requestInfo();
    const query = (info.query.query || "").trim();
    const dob = (info.query.dob || "").trim();

    if (!query || !dob) {
        return e.json(400, { error: "Missing query or dob parameters" });
    }

    try {
        let record;
        const upper = query.toUpperCase();
        const dobStart = dob + " 00:00:00.000Z";
        const dobEnd = dob + " 23:59:59.999Z";
        
        // 1. If it starts with APL-, search by participant_id
        if (upper.indexOf("APL-") === 0) {
            try {
                const records = $app.findRecordsByFilter(
                    "participants_application",
                    "participant_id = {:query} && dob >= {:dobStart} && dob <= {:dobEnd}",
                    "",
                    1,
                    0,
                    { query: upper, dobStart: dobStart, dobEnd: dobEnd }
                );
                if (records && records.length > 0) record = records[0];
            } catch (_) {}
        }
        
        // 2. If it is 12 digits, search by Aadhaar number
        else if (/^\d{12}$/.test(query)) {
            try {
                const records = $app.findRecordsByFilter(
                    "participants_application",
                    "aadhaar_number = {:query} && dob >= {:dobStart} && dob <= {:dobEnd}",
                    "",
                    1,
                    0,
                    { query: query, dobStart: dobStart, dobEnd: dobEnd }
                );
                if (records && records.length > 0) record = records[0];
            } catch (_) {}
        }
        
        // 3. Otherwise, try by 15-character record ID directly
        else if (query.length === 15) {
            try {
                const r = $app.findRecordById("participants_application", query);
                if (r && (r.get("dob") + "").indexOf(dob) === 0) {
                    record = r;
                }
            } catch (_) {}
        }

        if (!record) {
            return e.json(404, { error: "No matching application found" });
        }

        // Expand institution if present
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
        return e.json(500, { error: "Failed to query database: " + err });
    }
});

// ── 2. Secure update individual application ─────────────────────────────────
routerAdd("POST", "/api/public/update-individual", (e) => {
    const body = new DynamicModel({
        id: "",
        dob: "",
        status: "",
        full_name: "",
        father_name: "",
        father_number: "",
        aadhaar_number: "",
        gender: "",
        category: "",
        juz_options: "",
        selected_juz: "",
        whatsapp_number: "",
        email: "",
        guardian_name: "",
        guardian_phone: "",
        requires_accommodation: ""
    });
    e.bindBody(body);

    const id = body.id;
    const dob = body.dob;

    if (!id || !dob) {
        return e.json(400, { error: "Missing required parameters: id and dob" });
    }

    try {
        const record = $app.findRecordById("participants_application", id);
        if (!record) {
            return e.json(404, { error: "Record not found" });
        }

        // Verify DOB match
        if ((record.get("dob") + "").indexOf(dob) !== 0) {
            return e.json(403, { error: "Unauthorized. Date of birth mismatch." });
        }

        // Check if locked
        if (record.get("is_locked")) {
            return e.json(400, { error: "This application is locked and cannot be modified." });
        }

        // Extract old status
        const oldStatus = record.get("status");

        // List of fields that public users are allowed to edit
        const editableFields = [
            "full_name", "father_name", "father_number", "aadhaar_number",
            "gender", "category", "juz_options", "selected_juz",
            "whatsapp_number", "email", "guardian_name", "guardian_phone",
            "requires_accommodation"
        ];

        // Apply string field updates if present in data
        for (let i = 0; i < editableFields.length; i++) {
            const field = editableFields[i];
            const val = body[field];
            if (val !== undefined && val !== null && val !== "") {
                if (field === "requires_accommodation") {
                    record.set(field, val === "true" || val === true);
                } else {
                    record.set(field, val);
                }
            }
        }

        // Check for specific reapplying state
        const formStatus = body.status;
        if (formStatus !== undefined && formStatus !== null && formStatus !== "") {
            if (oldStatus === "rejected" && (formStatus === "reapplied" || formStatus === "pending")) {
                record.set("status", formStatus);
                record.set("approved_by", "");
                record.set("rejection_reason", "");
            } else if (formStatus !== oldStatus) {
                return e.json(403, { error: "Unauthorized status transition" });
            }
        }

        // Handle file uploads securely using findUploadedFiles if multipart body is present
        const info = e.requestInfo();
        const headers = info.headers || {};
        const contentType = headers["content-type"] || "";
        if (contentType.indexOf("multipart/form-data") !== -1) {
            const aadhaarFiles = e.findUploadedFiles("aadhaar_front");
            if (aadhaarFiles && aadhaarFiles.length > 0) {
                record.set("aadhaar_front", aadhaarFiles[0]);
            }

            const birthCertFiles = e.findUploadedFiles("birthcertificate_photo");
            if (birthCertFiles && birthCertFiles.length > 0) {
                record.set("birthcertificate_photo", birthCertFiles[0]);
            }

            const candidatePhotoFiles = e.findUploadedFiles("candidate_photo");
            if (candidatePhotoFiles && candidatePhotoFiles.length > 0) {
                record.set("candidate_photo", candidatePhotoFiles[0]);
            }
        }

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        // Fetch updated record to return
        const updated = $app.findRecordById("participants_application", id);
        const responseData = {
            id: updated.get("id"),
            participant_id: updated.get("participant_id"),
            full_name: updated.get("full_name"),
            father_name: updated.get("father_name"),
            father_number: updated.get("father_number"),
            aadhaar_number: updated.get("aadhaar_number"),
            dob: updated.get("dob"),
            gender: updated.get("gender"),
            category: updated.get("category"),
            juz_options: updated.get("juz_options"),
            selected_juz: updated.get("selected_juz"),
            whatsapp_number: updated.get("whatsapp_number"),
            email: updated.get("email"),
            guardian_name: updated.get("guardian_name"),
            guardian_phone: updated.get("guardian_phone"),
            requires_accommodation: updated.get("requires_accommodation"),
            status: updated.get("status"),
            is_locked: updated.get("is_locked"),
            rejection_reason: updated.get("rejection_reason"),
            allocated_venue: updated.get("allocated_venue"),
            aadhaar_front: updated.get("aadhaar_front"),
            birthcertificate_photo: updated.get("birthcertificate_photo"),
            candidate_photo: updated.get("candidate_photo"),
            created: updated.get("created"),
            updated: updated.get("updated")
        };

        return e.json(200, responseData);

    } catch (err) {
        return e.json(500, { error: "Failed to update record: " + err });
    }
});

// ── 3. Secure track institution ─────────────────────────────────────────────
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

// ── 4. Secure update institution ─────────────────────────────────────────────
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
            const docFiles = e.findUploadedFiles("document");
            if (docFiles && docFiles.length > 0) {
                record.set("document", docFiles[0]);
            }

            const buildingProofFiles = e.findUploadedFiles("instituition_building_proof");
            if (buildingProofFiles && buildingProofFiles.length > 0) {
                record.set("instituition_building_proof", buildingProofFiles[0]);
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

// ── 5. Secure public print application details ──────────────────────────────
routerAdd("GET", "/api/public/print-form", (e) => {
    const info = e.requestInfo();
    const id = (info.query.id || "").trim();
    const dob = (info.query.dob || "").trim();

    if (!id || !dob) {
        return e.json(400, { error: "Missing required parameters: id and dob" });
    }

    try {
        const record = $app.findRecordById("participants_application", id);
        if (!record) {
            return e.json(404, { error: "Record not found" });
        }

        // Verify DOB match
        if ((record.get("dob") + "").indexOf(dob) !== 0) {
            return e.json(403, { error: "Unauthorized. Date of birth mismatch." });
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
});// ── 6. Secure verify institution ─────────────────────────────────────────────
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
        return e.json(200, {
            id: record.get("id"),
            institution_id: record.get("institution_id"),
            name: record.get("name"),
            status: record.get("status")
        });
    } catch (err) {
        return e.json(500, { error: "Failed to verify institution: " + err });
    }
});

// ── 7. Secure check Aadhaar registration ─────────────────────────────────────
routerAdd("GET", "/api/public/check-aadhaar", (e) => {
    const info = e.requestInfo();
    const aadhaar = (info.query.aadhaar || "").trim();
    if (!aadhaar) {
        return e.json(400, { error: "Missing aadhaar parameter" });
    }
    try {
        const records = $app.findRecordsByFilter(
            "participants_application",
            "aadhaar_number = {:aadhaar}",
            "",
            1,
            0,
            { aadhaar: aadhaar }
        );
        return e.json(200, { exists: records && records.length > 0 });
    } catch (err) {
        return e.json(500, { error: "Failed to check Aadhaar: " + err });
    }
});

// ── 8. Secure submit application ─────────────────────────────────────────────
routerAdd("POST", "/api/public/submit-application", (e) => {
    const body = new DynamicModel({
        registration_type: "",
        institution_id: "",
        institution_ref: "",
        full_name: "",
        aadhaar_number: "",
        dob: "",
        category: "",
        gender: "",
        email: "",
        whatsapp_number: "",
        father_name: "",
        father_number: "",
        guardian_name: "",
        guardian_phone: "",
        requires_accommodation: "",
        selected_juz: "",
        juz_options: ""
    });
    e.bindBody(body);

    const regType = body.registration_type;
    const fullName = (body.full_name || "").trim();
    const dob = (body.dob || "").trim();
    const category = (body.category || "").trim();
    const gender = (body.gender || "").trim();
    const whatsapp = (body.whatsapp_number || "").trim();
    const guardianName = (body.guardian_name || "").trim();
    const guardianPhone = (body.guardian_phone || "").trim();

    if (!regType || !fullName || !dob || !category || !gender || !whatsapp || !guardianName || !guardianPhone) {
        return e.json(400, { error: "Missing required application parameters." });
    }

    try {
        // 1. Verify Institution details if registration_type is institution
        if (regType === "institution") {
            const instRef = body.institution_ref;
            if (!instRef) {
                return e.json(400, { error: "Institution reference is required for institution registration." });
            }
            const inst = $app.findRecordById("institutions", instRef);
            if (!inst) {
                return e.json(400, { error: "Invalid institution reference." });
            }
            if (inst.get("status") !== "approved") {
                return e.json(400, { error: "This institution is not approved yet." });
            }
        }

        // 2. Check duplicate Aadhaar if provided
        const aadhaar = (body.aadhaar_number || "").trim();
        if (aadhaar) {
            const existing = $app.findRecordsByFilter(
                "participants_application",
                "aadhaar_number = {:aadhaar}",
                "",
                1,
                0,
                { aadhaar: aadhaar }
            );
            if (existing && existing.length > 0) {
                return e.json(400, { aadhaar_number: { code: "validation_not_unique", message: "Aadhaar number is already registered." } });
            }
        }

        // 3. Age eligibility validation
        let eventDateStr = "2026-06-19T00:00:00.000Z";
        let ageCriteriaStr = '{"5_juz":{"min":0,"max":15},"15_juz":{"min":0,"max":19},"30_juz":{"min":0,"max":25}}';
        let bufferMonths = 3;

        try {
            const dateRec = $app.findFirstRecordByData("metadata", "key", "event_date");
            eventDateStr = dateRec.get("value") || eventDateStr;
        } catch (_) {}

        try {
            const criteriaRec = $app.findFirstRecordByData("metadata", "key", "event_age_criteria");
            ageCriteriaStr = criteriaRec.get("value") || ageCriteriaStr;
        } catch (_) {}

        try {
            const bufferRec = $app.findFirstRecordByData("metadata", "key", "age_buffer_months");
            bufferMonths = parseFloat(bufferRec.get("value")) || bufferMonths;
        } catch (_) {}

        const ageCriteria = JSON.parse(ageCriteriaStr);
        const rule = ageCriteria[category];

        if (rule) {
            const pDob = new Date(dob);
            const pEvent = new Date(eventDateStr);
            if (!isNaN(pDob.getTime()) && !isNaN(pEvent.getTime())) {
                let yearsDiff = pEvent.getFullYear() - pDob.getFullYear();
                let monthsDiff = pEvent.getMonth() - pDob.getMonth();
                let daysDiff = pEvent.getDate() - pDob.getDate();
                const totalMonths = yearsDiff * 12 + monthsDiff + (daysDiff / 30.4375);

                const maxMonths = rule.max * 12 + bufferMonths;
                const minMonths = rule.min * 12 - bufferMonths;

                if (totalMonths > maxMonths) {
                    return e.json(400, { error: "Candidate is over age limit for this category (" + rule.max + " years limit)." });
                }
                if (totalMonths < minMonths) {
                    return e.json(400, { error: "Candidate is under age limit for this category (" + rule.min + " years limit)." });
                }
            }
        }

        // 4. Create record
        const collection = $app.findCollectionByNameOrId("participants_application");
        const record = new Record(collection);
        
        record.set("registration_type", regType);
        if (regType === "institution") {
            record.set("institution_id", body.institution_id);
            record.set("institution_ref", body.institution_ref);
        }
        record.set("full_name", fullName);
        record.set("aadhaar_number", aadhaar);
        record.set("dob", dob);
        record.set("category", category);
        record.set("gender", gender);
        record.set("email", (body.email || "").trim());
        record.set("whatsapp_number", whatsapp);
        record.set("father_name", (body.father_name || "").trim());
        record.set("father_number", (body.father_number || "").trim());
        record.set("guardian_name", guardianName);
        record.set("guardian_phone", guardianPhone);
        record.set("requires_accommodation", body.requires_accommodation === "true" || body.requires_accommodation === true);
        record.set("selected_juz", (body.selected_juz || "").trim());
        record.set("juz_options", (body.juz_options || "").trim());
        record.set("status", "pending");

        // Files
        const aadhaarFiles = e.findUploadedFiles("aadhaar_front");
        if (aadhaarFiles && aadhaarFiles.length > 0) {
            record.set("aadhaar_front", aadhaarFiles[0]);
        }

        const birthcertFiles = e.findUploadedFiles("birthcertificate_photo");
        if (birthcertFiles && birthcertFiles.length > 0) {
            record.set("birthcertificate_photo", birthcertFiles[0]);
        }

        const candidatePhotoFiles = e.findUploadedFiles("candidate_photo");
        if (candidatePhotoFiles && candidatePhotoFiles.length > 0) {
            record.set("candidate_photo", candidatePhotoFiles[0]);
        }

        $app.save(record);

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        return e.json(200, {
            id: record.get("id"),
            status: record.get("status")
        });

    } catch (err) {
        return e.json(500, { error: "Failed to submit application: " + err });
    }
});


