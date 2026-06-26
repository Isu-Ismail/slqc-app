// ── 1. Archive Current Data Endpoint ──────────────────────────────────────────
routerAdd("POST", "/api/admin/archive-year", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const body = new DynamicModel({
            year: "",
            password: ""
        });
        e.bindBody(body);

        const year = (body.year || "").trim();
        const password = body.password;

        if (!year || !password) {
            return e.json(400, { error: "Year and password are required." });
        }

        if (!authRecord.validatePassword(password)) {
            return e.json(400, { error: "Invalid password." });
        }

        // Target collections to archive 
        // FIXED: Separated standard fields from file fields
        const mapping = {
            "participants_application": {
                dest: "participants_application_archive",
                fields: [
                    "registration_type", "institution_id", "institution_ref", "full_name", "aadhaar_number", "dob",
                    "participant_id", "category", "gender", "email", "whatsapp_number", "father_name", "father_number", "guardian_name",
                    "guardian_phone", "requires_accommodation", "address", "selected_juz", "juzz_options", "status",
                    "is_locked", "rejection_reason", "allocated_venue", "allocated_order", "is_finalist", "final_ranking",
                    "final_venue", "final_order"
                ],
                fileFields: ["aadhaar_front", "birthcertificate_photo", "candidate_photo"]
            },
            "institutions": {
                dest: "institutions_archive",
                fields: [
                    "name", "address", "contact_person", "email", "whatsapp_number", "phone_number", "status",
                    "approved_by", "institution_id", "is_locked",
                    "instituition_location", "passcode", "rejection_reason", "applications", "incharge", "is_checking"
                ],
                fileFields: ["document", "instituition_building_proof"]
            },
            "venue_detail": {
                dest: "venue_detail_archive",
                fields: [
                    "name", "category", "judges", "allocated_count", "capacity", "sittings", "is_final", "round"
                ]
            },
            "preliminary_marks": {
                dest: "preliminary_marks_archive",
                fields: [
                    "participant_ref", "values", "is_frozen"
                ]
            },
            "final_marks": {
                dest: "final_marks_archive",
                fields: [
                    "participant_ref", "values", "is_frozen"
                ]
            },
            "marksheet_uploads": {
                dest: "marksheet_uploads_archive",
                fields: [
                    "participant_ref", "round", "uploaded_by"
                ],
                fileFields: ["images"]
            },
            "mark_templates": {
                dest: "mark_templates_archive",
                fields: [
                    "round", "category", "columns"
                ]
            },
            "judges": {
                dest: "judges_archive",
                fields: [
                    "name", "phone_number", "institution", "place_of_stay", "pickup_incharge",
                    "contact_person_mobile", "final_judge", "allocated_venue", "final_venue"
                ]
            }
        };

        // Run transaction/archiving process
        $app.runInTransaction((txApp) => {
            Object.keys(mapping).forEach(srcCollectionName => {
                const config = mapping[srcCollectionName];
                const destCol = txApp.findCollectionByNameOrId(config.dest);
                const srcRecords = txApp.findRecordsByFilter(srcCollectionName, "1=1", "", 99999, 0);

                // Delete existing records for this year to prevent duplicates
                const oldArchives = txApp.findRecordsByFilter(config.dest, "year = {:year}", "", 99999, 0, { year: year });
                oldArchives.forEach(oldRec => {
                    txApp.delete(oldRec);
                });

                // Copy active records to archive
                srcRecords.forEach(srcRec => {
                    const archRec = new Record(destCol);
                    archRec.set("id", srcRec.get("id"));
                    archRec.set("year", year);

                    // 1. Copy Standard Fields (Text, Numbers, Relations)
                    if (config.fields) {
                        config.fields.forEach(field => {
                            let val = srcRec.get(field);
                            // Fallback for required JSON/text fields if they are empty
                            if ((field === "values" || field === "columns") && (!val || val === "null" || val === "")) {
                                val = "{}";
                            }
                            archRec.set(field, val);
                        });
                    }

                    // 2. Physically Duplicate Files
                    if (config.fileFields) {
                        config.fileFields.forEach(fileField => {
                            const fileData = srcRec.get(fileField);
                            if (!fileData) return; // Skip if no file is uploaded

                            // Files can be single (string) or multiple (array)
                            const namesArray = Array.isArray(fileData) ? fileData : [fileData];
                            const duplicateFiles = [];

                            namesArray.forEach(fileName => {
                                if (!fileName) return;

                                // Construct the physical file path: pb_data/storage/collectionId/recordId/filename
                                const filePath = $app.dataDir() + "/storage/" + srcRec.collection().id + "/" + srcRec.id + "/" + fileName;

                                try {
                                    // Tell PocketBase to read the physical file and ready it for upload
                                    const fileObj = $filesystem.fileFromPath(filePath);
                                    duplicateFiles.push(fileObj);
                                } catch (err) {
                                    console.log("File not found or read error:", filePath);
                                }
                            });

                            // Attach the physical file(s) to the new record
                            if (duplicateFiles.length === 1) {
                                archRec.set(fileField, duplicateFiles[0]);
                            } else if (duplicateFiles.length > 1) {
                                archRec.set(fileField, duplicateFiles);
                            }
                        });
                    }

                    // Save the record (and process the file uploads) safely inside the transaction
                    txApp.save(archRec);
                });
            });
        });

        return e.json(200, { success: true, message: "Successfully archived data for year " + year });
    } catch (err) {
        return e.json(500, { error: "Failed to archive data: " + err.toString() });
    }
});

// ── 2. Delete Past Year Archive Endpoint ──────────────────────────────────────
routerAdd("POST", "/api/admin/delete-archive-year", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const body = new DynamicModel({
            year: "",
            password: ""
        });
        e.bindBody(body);

        const year = (body.year || "").trim();
        const password = body.password;

        if (!year || !password) {
            return e.json(400, { error: "Year and password are required." });
        }

        // Validate password
        if (!authRecord.validatePassword(password)) {
            return e.json(400, { error: "Invalid password." });
        }

        const archiveCollections = [
            "participants_application_archive",
            "institutions_archive",
            "venue_detail_archive",
            "preliminary_marks_archive",
            "final_marks_archive",
            "marksheet_uploads_archive",
            "mark_templates_archive",
            "judges_archive"
        ];

        $app.runInTransaction((txApp) => {
            archiveCollections.forEach(colName => {
                const records = txApp.findRecordsByFilter(colName, "year = {:year}", "", 99999, 0, { year: year });
                records.forEach(rec => {
                    txApp.delete(rec);
                });
            });
        });

        return e.json(200, { success: true, message: "Successfully deleted archive data for year " + year });
    } catch (err) {
        return e.json(500, { error: "Failed to delete archive: " + err.toString() });
    }
});

// ── 3. List Archived Years ───────────────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/years", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        // Query unique years from participants_application_archive
        const query = $app.db()
            .select("year")
            .from("participants_application_archive")
            .groupBy("year");

        const rows = [];
        query.all(rows); // Query all rows into the rows array

        const years = rows.map(r => r.year);
        return e.json(200, years);
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archive years: " + err.toString() });
    }
});

// ── 4. Get Historical Participants ──────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/participants", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const year = (info.query.year || "").trim();
    if (!year) {
        return e.json(400, { error: "Missing year parameter." });
    }

    try {
        const records = $app.findRecordsByFilter("participants_application_archive", "year = {:year}", "-created", 99999, 0, { year: year });
        try {
            $app.expandRecords(records, ["institution_ref"]);
        } catch (_) {}

        const result = records.map(r => {
            let instName = "";
            try {
                const expandedInst = r.expandedOne("institution_ref");
                if (expandedInst) {
                    instName = expandedInst.get("name");
                }
            } catch (_) {}

            return {
                id: r.get("id"),
                participant_id: r.get("participant_id"),
                full_name: r.get("full_name"),
                father_name: r.get("father_name"),
                category: r.get("category"),
                gender: r.get("gender"),
                whatsapp_number: r.get("whatsapp_number"),
                status: r.get("status"),
                allocated_venue: r.get("allocated_venue"),
                allocated_order: r.get("allocated_order"),
                is_finalist: r.get("is_finalist") === true,
                institution_id: r.get("institution_id"),
                institution_ref: r.get("institution_ref"),
                institution_name: instName,
                year: r.get("year")
            };
        });
        return e.json(200, result);
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archived participants: " + err.toString() });
    }
});

// ── 5. Get Historical Venues ─────────────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/venues", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const year = (info.query.year || "").trim();
    if (!year) {
        return e.json(400, { error: "Missing year parameter." });
    }

    try {
        const records = $app.findRecordsByFilter("venue_detail_archive", "year = {:year}", "name", 99999, 0, { year: year });
        const result = records.map(r => {
            return {
                id: r.get("id"),
                name: r.get("name"),
                category: r.get("category"),
                judges: r.get("judges"),
                allocated_count: r.get("allocated_count"),
                capacity: r.get("capacity"),
                sittings: r.get("sittings"),
                is_final: r.get("is_final") === true,
                round: r.get("round"),
                year: r.get("year")
            };
        });
        return e.json(200, result);
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archived venues: " + err.toString() });
    }
});

// ── 6. Get Historical Marks ──────────────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/marks", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const year = (info.query.year || "").trim();
    if (!year) {
        return e.json(400, { error: "Missing year parameter." });
    }

    try {
        const prelimMarks = $app.findRecordsByFilter("preliminary_marks_archive", "year = {:year}", "", 99999, 0, { year: year });
        const finalMarks = $app.findRecordsByFilter("final_marks_archive", "year = {:year}", "", 99999, 0, { year: year });

        const prelimList = prelimMarks.map(r => ({
            id: r.get("id"),
            participant_ref: r.get("participant_ref"),
            judge_ref: r.get("judge_ref"),
            tajweed: r.get("tajweed"),
            hifz: r.get("hifz"),
            mutashabihat: r.get("mutashabihat"),
            total: r.get("total"),
            is_absent: r.get("is_absent") === true
        }));

        const finalList = finalMarks.map(r => ({
            id: r.get("id"),
            participant_ref: r.get("participant_ref"),
            sitting_number: r.get("sitting_number"),
            judge_ref: r.get("judge_ref"),
            tajweed: r.get("tajweed"),
            hifz: r.get("hifz"),
            mutashabihat: r.get("mutashabihat"),
            total: r.get("total"),
            is_absent: r.get("is_absent") === true
        }));

        return e.json(200, {
            preliminary: prelimList,
            final: finalList
        });
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archived marks: " + err.toString() });
    }
});

// ── 7. Get Historical Institutions ───────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/institutions", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const year = (info.query.year || "").trim();
    if (!year) {
        return e.json(400, { error: "Missing year parameter." });
    }

    try {
        const records = $app.findRecordsByFilter("institutions_archive", "year = {:year}", "name", 99999, 0, { year: year });
        const result = records.map(r => {
            return {
                id: r.get("id"),
                institution_id: r.get("institution_id"),
                name: r.get("name"),
                address: r.get("address"),
                contact_person: r.get("contact_person"),
                email: r.get("email"),
                whatsapp_number: r.get("whatsapp_number"),
                phone_number: r.get("phone_number"),
                status: r.get("status"),
                year: r.get("year")
            };
        });
        return e.json(200, result);
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archived institutions: " + err.toString() });
    }
});

// ── 8. Get Historical Judges ─────────────────────────────────────────────────
routerAdd("GET", "/api/admin/archive/judges", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const year = (info.query.year || "").trim();
    if (!year) {
        return e.json(400, { error: "Missing year parameter." });
    }

    try {
        const records = $app.findRecordsByFilter("judges_archive", "year = {:year}", "name", 99999, 0, { year: year });
        const result = records.map(r => {
            return {
                id: r.get("id"),
                name: r.get("name"),
                phone_number: r.get("phone_number"),
                institution: r.get("institution"),
                place_of_stay: r.get("place_of_stay"),
                pickup_incharge: r.get("pickup_incharge"),
                contact_person_mobile: r.get("contact_person_mobile"),
                final_judge: r.get("final_judge") === true,
                allocated_venue: r.get("allocated_venue"),
                final_venue: r.get("final_venue"),
                year: r.get("year")
            };
        });
        return e.json(200, result);
    } catch (err) {
        return e.json(500, { error: "Failed to fetch archived judges: " + err.toString() });
    }
});

// ── 9. Verify Admin Password Endpoint ─────────────────────────────────────────
routerAdd("POST", "/api/admin/verify-password", (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(403, { error: "Unauthorized." });
    }

    try {
        const body = new DynamicModel({ password: "" });
        e.bindBody(body);

        if (!body.password) {
            return e.json(400, { error: "Password is required." });
        }

        if (!authRecord.validatePassword(body.password)) {
            return e.json(400, { error: "Invalid password." });
        }

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Verification failed: " + err.toString() });
    }
});
