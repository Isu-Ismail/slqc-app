// pocketbase/pb_hooks/public_api_participants.pb.js

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

        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) {}
        }

        const responseData = {
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
            is_locked: record.get("is_locked"),
            rejection_reason: record.get("rejection_reason"),
            allocated_venue: record.get("allocated_venue"),
            aadhaar_front: record.get("aadhaar_front"),
            birthcertificate_photo: record.get("birthcertificate_photo"),
            candidate_photo: record.get("candidate_photo"),
            created: record.get("created"),
            updated: record.get("updated")
        };

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
        return e.json(500, { error: "Failed to query database: " + err });
    }
});

// ── 2. Secure update individual application ─────────────────────────────────
routerAdd("POST", "/api/public/update-individual", (e) => {
    // Context verification
    const info = e.requestInfo();
    const id = (info.query.id || "").trim();
    const dob = (info.query.dob || "").trim();

    if (!id || !dob) {
        return e.json(400, { error: "Missing required parameters: id and dob" });
    }

    try {
        const record = $app.findRecordById("participants_application", id);
        if (!record) {
            return e.json(404, { error: "Application not found" });
        }

        // Verify DOB match
        if ((record.get("dob") + "").indexOf(dob) !== 0) {
            return e.json(403, { error: "Unauthorized. Date of birth mismatch." });
        }

        if (record.get("is_locked") === true) {
            return e.json(400, { error: "Application is locked and cannot be updated." });
        }

        // Process request parameters securely
        const headers = info.headers || {};
        let contentType = "";
        const ctHeader = headers["content_type"] || headers["content-type"] || headers["Content-Type"] || headers["Content-Type"];
        if (ctHeader) {
            if (typeof ctHeader === "string") {
                contentType = ctHeader;
            } else if (Array.isArray(ctHeader) && ctHeader.length > 0) {
                contentType = ctHeader[0];
            } else if (typeof ctHeader.length === "number" && ctHeader.length > 0) {
                contentType = ctHeader[0];
            } else {
                contentType = String(ctHeader);
            }
        }
        contentType = contentType.toLowerCase();

        const data = info.data || {};
        
        const getFormVal = (name) => {
            let val = data[name] || "";
            if (!val) {
                if (typeof e.FormValue === "function") {
                    val = e.FormValue(name) || "";
                } else if (typeof e.formValue === "function") {
                    val = e.formValue(name) || "";
                } else if (e.request && typeof e.request.FormValue === "function") {
                    val = e.request.FormValue(name) || "";
                } else if (e.request && typeof e.request.formValue === "function") {
                    val = e.request.formValue(name) || "";
                }
            }
            return val;
        };

        const formStatus = getFormVal("status");
        const oldStatus = record.get("status");

        if (formStatus) {
            if (oldStatus === "rejected") {
                if (formStatus !== "reapplied") {
                    return e.json(400, { error: "Invalid status transition" });
                }
            } else if (formStatus !== oldStatus) {
                return e.json(403, { error: "Unauthorized status transition" });
            }
        }

        // Handle file uploads securely using findUploadedFiles if multipart body is present
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

        // Update fields securely
        const fields = [
            "full_name", "father_name", "father_number", "aadhaar_number", 
            "dob", "gender", "category", "juz_options", "selected_juz", 
            "whatsapp_number", "email", "guardian_name", "guardian_phone", 
            "requires_accommodation", "status", "approved_by", "rejection_reason"
        ];

        fields.forEach(field => {
            let val = getFormVal(field);
            if (val) {
                if (field === "requires_accommodation") {
                    record.set(field, val === "true" || val === true);
                } else {
                    record.set(field, val);
                }
            }
        });

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
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update individual application: " + err });
    }
});

// ── 3. Secure public print application details ──────────────────────────────
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
});

// ── 4. Secure check Aadhaar registration ─────────────────────────────────────
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

// ── 5. Secure submit application ─────────────────────────────────────────────
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
