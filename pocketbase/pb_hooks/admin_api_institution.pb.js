// pocketbase/pb_hooks/admin_api_institution.pb.js

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
                street_address: institution.get("street_address"), // NEW
                pincode: institution.get("pincode"),               // NEW
                state_name: institution.get("state_name"),         // NEW
                district_name: institution.get("district_name"),   // NEW
                village_name: institution.get("village_name"),     // NEW
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
                passcode: institution.get("passcode"),
                incharge: institution.get("incharge"),
                incharge_number: institution.get("incharge_number")
            },


            applications: appList
        });

    } catch (err) {
        return e.json(500, { error: "Failed to query database: " + err });
    }
});

// ── 5. Assign In-Charge Endpoint ─────────────────────────────────────────────
routerAdd("POST", "/api/admin/assign-incharge", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    try {
        const body = e.requestInfo().body;
        const institutionId = body.institutionId;
        const incharge = (body.incharge || "").trim();
        const incharge_number = (body.incharge_number || "").trim();

        if (!institutionId) {
            return e.json(400, { error: "Missing institutionId parameter" });
        }

        const record = $app.findRecordById("institutions", institutionId);
        if (!record) {
            return e.json(404, { error: "Institution not found" });
        }

        record.set("incharge", incharge);
        record.set("incharge_number", incharge_number);
        $app.save(record);

        return e.json(200, {
            success: true,
            institution: {
                id: record.get("id"),
                institution_id: record.get("institution_id"),
                name: record.get("name"),
                address: record.get("address"),
                contact_person: record.get("contact_person"),
                email: record.get("email"),
                whatsapp_number: record.get("whatsapp_number"),
                phone_number: record.get("phone_number"),
                document: record.get("document"),
                instituition_location: record.get("instituition_location"),
                instituition_building_proof: record.get("instituition_building_proof"),
                status: record.get("status"),
                is_locked: record.get("is_locked"),
                rejection_reason: record.get("rejection_reason"),
                passcode: record.get("passcode"),
                incharge: record.get("incharge"),
                incharge_number: record.get("incharge_number")
            }
        });
    } catch (err) {
        return e.json(500, { error: "Failed to update incharge: " + err });
    }
});

