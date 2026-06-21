// pocketbase/pb_hooks/admin_api_judges.pb.js

// ── 1. List Judges Endpoint ───────────────────────────────────────────────────
routerAdd("GET", "/api/admin/judges", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const judges = $app.findRecordsByFilter("judges", "1=1", "-created", 99999, 0);
        const result = [];
        judges.forEach(j => {
            result.push({
                id: j.get("id"),
                name: j.get("name"),
                phone_number: j.get("phone_number"),
                institution: j.get("institution"),
                place_of_stay: j.get("place_of_stay"),
                pickup_incharge: j.get("pickup_incharge"),
                contact_person_mobile: j.get("contact_person_mobile"),
                final_judge: j.get("final_judge") === true,
                allocated_venue: j.get("allocated_venue"),
                created: j.get("created"),
                updated: j.get("updated")
            });
        });
        return e.json(200, result);
    } catch (err) {
        return e.json(500, { error: "Failed to list judges: " + err });
    }
});

// ── 2. Create Judge Endpoint ──────────────────────────────────────────────────
routerAdd("POST", "/api/admin/judges/create", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const body = new DynamicModel({
            name: "",
            phone_number: "",
            institution: "",
            place_of_stay: "",
            pickup_incharge: "",
            contact_person_mobile: "",
            final_judge: false
        });
        e.bindBody(body);

        if (!body.name || !body.phone_number) {
            return e.json(400, { error: "Name and phone number are required." });
        }

        const collection = $app.findCollectionByNameOrId("judges");
        const record = new Record(collection);
        record.set("name", body.name);
        record.set("phone_number", body.phone_number);
        record.set("institution", body.institution || "");
        record.set("place_of_stay", body.place_of_stay || "");
        record.set("pickup_incharge", body.pickup_incharge || "");
        record.set("contact_person_mobile", body.contact_person_mobile || "");
        record.set("final_judge", body.final_judge === true);
        record.set("allocated_venue", ""); // Default unallocated

        $app.save(record);

        return e.json(200, {
            id: record.get("id"),
            name: record.get("name"),
            phone_number: record.get("phone_number"),
            institution: record.get("institution"),
            place_of_stay: record.get("place_of_stay"),
            pickup_incharge: record.get("pickup_incharge"),
            contact_person_mobile: record.get("contact_person_mobile"),
            final_judge: record.get("final_judge") === true,
            allocated_venue: record.get("allocated_venue"),
            created: record.get("created"),
            updated: record.get("updated")
        });
    } catch (err) {
        return e.json(500, { error: "Failed to create judge: " + err });
    }
});

// ── 3. Update Judge Endpoint ──────────────────────────────────────────────────
routerAdd("POST", "/api/admin/judges/update", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const body = new DynamicModel({
            id: "",
            name: "",
            phone_number: "",
            institution: "",
            place_of_stay: "",
            pickup_incharge: "",
            contact_person_mobile: "",
            final_judge: false,
            allocated_venue: ""
        });
        e.bindBody(body);

        if (!body.id) {
            return e.json(400, { error: "Missing judge ID." });
        }

        const record = $app.findRecordById("judges", body.id);
        if (body.name !== undefined && body.name !== null) record.set("name", body.name);
        if (body.phone_number !== undefined && body.phone_number !== null) record.set("phone_number", body.phone_number);
        if (body.institution !== undefined && body.institution !== null) record.set("institution", body.institution);
        if (body.place_of_stay !== undefined && body.place_of_stay !== null) record.set("place_of_stay", body.place_of_stay);
        if (body.pickup_incharge !== undefined && body.pickup_incharge !== null) record.set("pickup_incharge", body.pickup_incharge);
        if (body.contact_person_mobile !== undefined && body.contact_person_mobile !== null) record.set("contact_person_mobile", body.contact_person_mobile);
        if (body.final_judge !== undefined && body.final_judge !== null) record.set("final_judge", body.final_judge === true);
        if (body.allocated_venue !== undefined && body.allocated_venue !== null) record.set("allocated_venue", body.allocated_venue);

        $app.save(record);

        return e.json(200, {
            id: record.get("id"),
            name: record.get("name"),
            phone_number: record.get("phone_number"),
            institution: record.get("institution"),
            place_of_stay: record.get("place_of_stay"),
            pickup_incharge: record.get("pickup_incharge"),
            contact_person_mobile: record.get("contact_person_mobile"),
            final_judge: record.get("final_judge") === true,
            allocated_venue: record.get("allocated_venue"),
            created: record.get("created"),
            updated: record.get("updated")
        });
    } catch (err) {
        return e.json(500, { error: "Failed to update judge: " + err });
    }
});

// ── 4. Delete Judge Endpoint ──────────────────────────────────────────────────
routerAdd("POST", "/api/admin/judges/delete", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const body = new DynamicModel({
            id: ""
        });
        e.bindBody(body);

        if (!body.id) {
            return e.json(400, { error: "Missing judge ID." });
        }

        const record = $app.findRecordById("judges", body.id);
        $app.delete(record);

        return e.json(200, { success: true, message: "Judge deleted successfully." });
    } catch (err) {
        return e.json(500, { error: "Failed to delete judge: " + err });
    }
});
