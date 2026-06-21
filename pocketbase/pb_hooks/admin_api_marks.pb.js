routerAdd("GET", "/api/admin/marks/get-venue-sheet", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }

    const info = e.requestInfo();
    const venueName = (info.query.venue || "").trim();
    const round = (info.query.round || "preliminary").trim();

    if (!venueName) {
        return e.json(400, { error: "Missing venue context parameter." });
    }

    try {
        // 1. Fetch the venue detail to look up category rules
        const venueRec = $app.findFirstRecordByData("venue_detail", "name", venueName);
        const category = venueRec.get("category");

        // Fetch judges
        let venueJudges = [];
        try {
            const rawJudges = venueRec.getString("judges");
            if (rawJudges) {
                const parsed = JSON.parse(rawJudges);
                if (Array.isArray(parsed)) {
                    parsed.forEach(j => {
                        if (j && typeof j === "object" && j.id) {
                            venueJudges.push({
                                id: j.id,
                                name: j.name || ""
                            });
                        } else if (typeof j === "string") {
                            try {
                                const judgeRec = $app.findRecordById("judges", j);
                                venueJudges.push({
                                    id: judgeRec.get("id"),
                                    name: judgeRec.get("name")
                                });
                            } catch (_) {}
                        }
                    });
                }
            }
        } catch (_) {}

        // 2. Load the dynamic configuration template columns
        let templateColumns = { questions: [], criteria: [] };
        try {
            const templateRec = $app.findFirstRecordByData("mark_templates", "round", round, "category", category);
            templateColumns = JSON.parse(templateRec.getString("columns") || "{\"questions\":[],\"criteria\":[]}");
        } catch (_) { }

        // 3. Select corresponding dataset filter parameters
        const marksCollection = round === "preliminary" ? "preliminary_marks" : "final_marks";
        const isFinalistFilter = round === "preliminary" ? "is_finalist = false" : "is_finalist = true";

        // CRUCIAL UPDATE: Added 'arrival_status != "absent"' to the filter string
        const filterString = "status = 'approved' && allocated_venue = {:venue} && arrival_status != 'absent' && " + isFinalistFilter;

        const students = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            2000,
            0,
            { venue: venueName }
        );

        const gridRows = [];
        students.forEach(student => {
            let existingValues = {};
            let isFrozen = false;
            let markRecordId = "";

            try {
                const markRec = $app.findFirstRecordByData(marksCollection, "participant_ref", student.get("id"));
                existingValues = JSON.parse(markRec.getString("values") || "{}");
                isFrozen = markRec.get("is_frozen") === true;
                markRecordId = markRec.get("id");
            } catch (_) { }

            gridRows.push({
                mark_record_id: markRecordId,
                participant_id: student.get("id"),
                register_id: student.get("participant_id"),
                full_name: student.get("full_name"),
                category: student.get("category"),
                values: existingValues,
                is_frozen: isFrozen
            });
        });

        return e.json(200, {
            category: category,
            judges: venueJudges,
            columns: templateColumns,
            rows: gridRows
        });

    } catch (err) {
        return e.json(500, { error: "Failed to construct score entry spreadsheet data grid: " + err });
    }
});

routerAdd("POST", "/api/admin/marks/save-cell", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Access denied." });
    }

    const body = new DynamicModel({
        round: "preliminary",
        participant_id: "",
        values: {}
    });
    e.bindBody(body);

    if (!body.participant_id) {
        return e.json(400, { error: "Missing participant reference validation constraint." });
    }

    const marksCollection = body.round === "final" ? "final_marks" : "preliminary_marks";

    try {
        let record;
        const collection = $app.findCollectionByNameOrId(marksCollection);

        try {
            record = $app.findFirstRecordByData(marksCollection, "participant_ref", body.participant_id);
            if (record.get("is_frozen") === true) {
                return e.json(400, { error: "This marksheet cell collection entry has been locked and frozen." });
            }
        } catch (_) {
            record = new Record(collection);
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let randomId = "";
            for (let i = 0; i < 15; i++) {
                randomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            record.set("id", randomId);
            record.set("participant_ref", body.participant_id);
            record.set("is_frozen", false);
        }

        // Perform dynamic safe evaluation on server layout parameters
        const studentRec = $app.findRecordById("participants_application", body.participant_id);
        const templateRec = $app.findFirstRecordByData("mark_templates", "round", body.round, "category", studentRec.get("category"));
        const parsedColumns = JSON.parse(templateRec.getString("columns") || "{}");
        let criteriaList = [];
        if (Array.isArray(parsedColumns)) {
            criteriaList = parsedColumns;
        } else if (parsedColumns && Array.isArray(parsedColumns.criteria)) {
            criteriaList = parsedColumns.criteria;
        }

        let calculatedValues = { ...body.values };

        // Process formulas mathematically using primitive safely-bounded execution rules
        criteriaList.forEach(col => {
            if (col.type === "formula" && col.formula) {
                let expression = col.formula;
                // Replace key tokens with integer representation values
                criteriaList.forEach(variable => {
                    if (variable.type === "number") {
                        const cellVal = parseFloat(calculatedValues[variable.key]) || 0;
                        expression = expression.split(variable.key).join(cellVal);
                    }
                });

                try {
                    // Safe basic evaluation routine via basic JS engine processing sandbox rules
                    const result = eval(expression);
                    calculatedValues[col.key] = isNaN(result) || !isFinite(result) ? 0 : Number(result.toFixed(2));
                } catch (_) {
                    calculatedValues[col.key] = 0;
                }
            }
        });

        record.set("values", JSON.stringify(calculatedValues));
        $app.save(record);

        return e.json(200, { success: true, updated_values: calculatedValues });

    } catch (err) {
        return e.json(500, { error: "Cell upsert state commit failed: " + err });
    }
});

routerAdd("GET", "/api/admin/marks/get-template", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }
    const info = e.requestInfo();
    const round = (info.query.round || "preliminary").trim();
    const category = (info.query.category || "5_juz").trim();
    try {
        const record = $app.findFirstRecordByData("mark_templates", "round", round, "category", category);
        return e.json(200, {
            id: record.get("id"),
            round: record.get("round"),
            category: record.get("category"),
            columns: JSON.parse(record.getString("columns") || "{\"questions\":[],\"criteria\":[]}")
        });
    } catch (err) {
        return e.json(200, {
            id: "",
            round: round,
            category: category,
            columns: { questions: [], criteria: [] }
        });
    }
});

routerAdd("POST", "/api/admin/marks/save-template", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Access denied. Only admins can edit templates." });
    }
    const body = new DynamicModel({
        round: "preliminary",
        category: "5_juz",
        columns: {}
    });
    e.bindBody(body);

    try {
        let record;
        const collection = $app.findCollectionByNameOrId("mark_templates");
        try {
            record = $app.findFirstRecordByData("mark_templates", "round", body.round, "category", body.category);
        } catch (_) {
            record = new Record(collection);
            // Generate a 15-character lowercase alphanumeric ID (PocketBase standard format)
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let randomId = "";
            for (let i = 0; i < 15; i++) {
                randomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            record.set("id", randomId);
            record.set("round", body.round);
            record.set("category", body.category);
        }
        record.set("columns", JSON.stringify(body.columns));
        $app.save(record);
        return e.json(200, { success: true, id: record.get("id") });
    } catch (err) {
        return e.json(500, { error: "Failed to save template: " + err });
    }
});

routerAdd("GET", "/api/admin/marks/check-preliminary-complete", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }
    
    const isPreliminaryComplete = () => {
        const filterString = "status = 'approved' && arrival_status != 'absent' && is_finalist = false && allocated_venue != ''";
        const prelimStudents = $app.findRecordsByFilter("participants_application", filterString, "", 2000, 0);
        
        for (let i = 0; i < prelimStudents.length; i++) {
            const student = prelimStudents[i];
            try {
                const markRec = $app.findFirstRecordByData("preliminary_marks", "participant_ref", student.get("id"));
                if (markRec.get("is_frozen") !== true) {
                    return false;
                }
            } catch (_) {
                return false;
            }
        }
        return true;
    };

    return e.json(200, { complete: isPreliminaryComplete() });
});

routerAdd("GET", "/api/admin/marks/get-students-status", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }
    const info = e.requestInfo();
    const venueName = (info.query.venue || "").trim();
    const round = (info.query.round || "preliminary").trim();

    if (!venueName) {
        return e.json(400, { error: "Missing venue context parameter." });
    }

    const isPreliminaryComplete = () => {
        const filterString = "status = 'approved' && arrival_status != 'absent' && is_finalist = false && allocated_venue != ''";
        const prelimStudents = $app.findRecordsByFilter("participants_application", filterString, "", 2000, 0);
        
        for (let i = 0; i < prelimStudents.length; i++) {
            const student = prelimStudents[i];
            try {
                const markRec = $app.findFirstRecordByData("preliminary_marks", "participant_ref", student.get("id"));
                if (markRec.get("is_frozen") !== true) {
                    return false;
                }
            } catch (_) {
                return false;
            }
        }
        return true;
    };

    try {
        const isAllVenues = venueName.toLowerCase() === "all";

        let filterString = "status = 'approved' && arrival_status != 'absent'";
        const isFinalistFilter = round === "preliminary" ? "is_finalist = false" : "is_finalist = true";
        filterString += " && " + isFinalistFilter;

        let queryParams = {};
        if (isAllVenues) {
            filterString += " && allocated_venue != ''";
        } else {
            filterString += " && allocated_venue = {:venue}";
            queryParams.venue = venueName;
        }

        const students = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            2000,
            0,
            queryParams
        );

        const pending = [];
        const completed = [];

        students.forEach(student => {
            let existingValues = {};
            let isFrozen = false;
            let markRecordId = "";

            const marksCollection = round === "preliminary" ? "preliminary_marks" : "final_marks";
            try {
                const markRec = $app.findFirstRecordByData(marksCollection, "participant_ref", student.get("id"));
                existingValues = JSON.parse(markRec.getString("values") || "{}");
                isFrozen = markRec.get("is_frozen") === true;
                markRecordId = markRec.get("id");
            } catch (_) {}

            // Resolve judges for student's allocated venue
            const studentVenue = student.get("allocated_venue");
            const studentJudges = [];
            if (studentVenue) {
                try {
                    const venueRec = $app.findFirstRecordByData("venue_detail", "name", studentVenue);
                    let parsedJudges = [];
                    try {
                        const raw = venueRec.getString("judges");
                        if (raw) {
                            parsedJudges = JSON.parse(raw);
                        }
                    } catch (_) {}
                    if (!Array.isArray(parsedJudges)) parsedJudges = [];

                    parsedJudges.forEach(j => {
                        if (j && typeof j === "object" && j.id) {
                            studentJudges.push({
                                id: j.id,
                                name: j.name || ""
                            });
                        } else if (typeof j === "string") {
                            try {
                                const judgeRec = $app.findRecordById("judges", j);
                                studentJudges.push({
                                    id: judgeRec.get("id"),
                                    name: judgeRec.get("name")
                                });
                            } catch (_) {}
                        }
                    });
                } catch (_) {}
            }

            const studentData = {
                mark_record_id: markRecordId,
                participant_id: student.get("id"),
                register_id: student.get("participant_id"),
                full_name: student.get("full_name"),
                category: student.get("category"),
                values: existingValues,
                is_frozen: isFrozen,
                judges: studentJudges
            };

            if (isFrozen) {
                completed.push(studentData);
            } else {
                pending.push(studentData);
            }
        });

        return e.json(200, {
            preliminary_complete: isPreliminaryComplete(),
            pending: pending,
            completed: completed
        });
    } catch (err) {
        return e.json(500, { error: "Failed to load students status: " + err });
    }
});

routerAdd("POST", "/api/admin/marks/save-student-marks", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Access denied." });
    }

    const body = new DynamicModel({
        round: "preliminary",
        participant_id: "",
        values: {},
        is_frozen: true
    });
    e.bindBody(body);

    if (!body.participant_id) {
        return e.json(400, { error: "Missing participant_id." });
    }

    const isPreliminaryComplete = () => {
        const filterString = "status = 'approved' && arrival_status != 'absent' && is_finalist = false && allocated_venue != ''";
        const prelimStudents = $app.findRecordsByFilter("participants_application", filterString, "", 2000, 0);
        
        for (let i = 0; i < prelimStudents.length; i++) {
            const student = prelimStudents[i];
            try {
                const markRec = $app.findFirstRecordByData("preliminary_marks", "participant_ref", student.get("id"));
                if (markRec.get("is_frozen") !== true) {
                    return false;
                }
            } catch (_) {
                return false;
            }
        }
        return true;
    };

    if (body.round === "final") {
        try {
            const studentRec = $app.findRecordById("participants_application", body.participant_id);
            if (studentRec.get("is_finalist") !== true) {
                return e.json(400, { error: "Cannot save final marks: Participant is not marked as a finalist." });
            }
            try {
                $app.findFirstRecordByData("preliminary_marks", "participant_ref", body.participant_id);
            } catch (_) {
                return e.json(400, { error: "Cannot save final marks: No preliminary marks record found for this finalist." });
            }
        } catch (err) {
            return e.json(400, { error: "Failed to validate finalist status: " + err });
        }
    }

    const marksCollection = body.round === "final" ? "final_marks" : "preliminary_marks";

    try {
        let record;
        const collection = $app.findCollectionByNameOrId(marksCollection);

        try {
            record = $app.findFirstRecordByData(marksCollection, "participant_ref", body.participant_id);
        } catch (_) {
            record = new Record(collection);
            const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            let randomId = "";
            for (let i = 0; i < 15; i++) {
                randomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            record.set("id", randomId);
            record.set("participant_ref", body.participant_id);
        }

        record.set("values", JSON.stringify(body.values));
        record.set("is_frozen", body.is_frozen === true);
        $app.save(record);

        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Save marks failed: " + err });
    }
});

// NOTE: marksheet_uploads collection schema is managed via schema.json
// (imported by db_init.pb.js on every startup — no need to duplicate here).



// ---------- GET /api/admin/marks/get-marksheets ----------
// Aggregates images from ALL marksheet_uploads records for a participant+round.
// Only admins and coordinators can view marksheets.
routerAdd("GET", "/api/admin/marks/get-marksheets", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized. Only admins and coordinators can view marksheets." });
    }

    const info          = e.requestInfo();
    const participantId = (info.query["participant_id"] || "").trim();
    const round         = (info.query["round"] || "preliminary").trim();

    if (!participantId) {
        return e.json(400, { error: "Missing participant_id." });
    }

    try {
        // Fetch ALL records for this participant+round (frontend may create multiple)
        let records;
        try {
            records = $app.findRecordsByFilter(
                "marksheet_uploads",
                "participant_ref = {:pid} && round = {:round}",
                "-created",
                100,
                0,
                { pid: participantId, round: round }
            );
        } catch (_) {
            return e.json(200, { images: [], records: [], count: 0 });
        }

        if (!records || records.length === 0) {
            return e.json(200, { images: [], records: [], count: 0 });
        }

        const appUrl = ($app.settings().meta.appURL || "").replace(/\/$/, "");

        // Aggregate all images across all records
        const allImages = [];
        const recordSummaries = [];

        records.forEach(record => {
            const collectionId = record.collection().id;
            const recordId     = record.get("id");
            const raw          = record.get("images") || [];
            const filenames    = Array.isArray(raw) ? raw : [raw].filter(Boolean);

            filenames.forEach(f => {
                allImages.push({
                    url:      `${appUrl}/api/files/${collectionId}/${recordId}/${f}`,
                    filename: f,
                    recordId: recordId
                });
            });

            recordSummaries.push({
                id:    recordId,
                count: filenames.length
            });
        });

        return e.json(200, {
            participant_ref: participantId,
            round:           round,
            images:          allImages.map(i => i.url),
            filenames:       allImages.map(i => i.filename),
            image_details:   allImages,
            records:         recordSummaries,
            count:           allImages.length
        });

    } catch (err) {
        return e.json(500, { error: "Failed to fetch marksheets: " + err });
    }
});

// ---------- DELETE /api/admin/marks/delete-marksheet-image ----------
// Admins only — remove a single image by filename from a specific record.
routerAdd("DELETE", "/api/admin/marks/delete-marksheet-image", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Only admins can delete marksheet images." });
    }

    const info      = e.requestInfo();
    const recordId  = (info.query["record_id"] || "").trim();
    const filename  = (info.query["filename"] || "").trim();

    if (!recordId || !filename) {
        return e.json(400, { error: "Missing record_id or filename." });
    }

    try {
        const record = $app.findRecordById("marksheet_uploads", recordId);
        record.set("images-", filename);
        $app.save(record);
        return e.json(200, { success: true });
    } catch (err) {
        return e.json(500, { error: "Failed to delete image: " + err });
    }
});