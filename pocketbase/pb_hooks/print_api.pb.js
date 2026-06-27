// pocketbase/pb_hooks/print_api.pb.js

routerAdd("GET", "/api/admin/print-form", (e) => {
    const getParticipantPrintData = function (record) {
        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) {
                try {
                    expandedApprover = $app.findRecordById("_superusers", approvedBy);
                } catch (__) { }
            }
        }

        let expandedInst = null;
        const instRef = record.get("institution_ref");
        if (instRef) {
            try {
                expandedInst = $app.findRecordById("institutions", instRef);
            } catch (_) { }
        }

        return {
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
            juz_options: record.get("juzz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            status: record.get("status"),
            arrival_status: record.get("arrival_status") || "none",
            address: record.get("address") || "",
            registration_type: record.get("registration_type") || "individual",
            allocated_venue: record.get("allocated_venue"),
            allocated_order: record.get("allocated_order"),
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
                    contact_person: expandedInst.get("contact_person") || "N/A",
                    email: expandedInst.get("email"),
                    phone_number: expandedInst.get("phone_number") || expandedInst.get("whatsapp_number") || "N/A",
                    address: [
                        expandedInst.get("street_address"),
                        expandedInst.get("village_name"),
                        expandedInst.get("district_name"),
                        expandedInst.get("state_name"),
                        expandedInst.get("pincode")
                    ].filter(Boolean).join(", "),
                } : null
            }
        };
    };

    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const idParam = (info.query.id || "").trim();

    if (!idParam) {
        return e.json(400, { error: "Missing required parameter: id" });
    }

    const ids = idParam.split(",").map(x => x.trim()).filter(x => x);

    try {
        const list = [];
        for (let i = 0; i < ids.length; i++) {
            const record = $app.findRecordById("participants_application", ids[i]);
            if (record) {
                list.push(getParticipantPrintData(record));
            }
        }

        if (list.length === 0) {
            return e.json(404, { error: "No records found" });
        }

        if (list.length === 1) {
            return e.json(200, list[0]);
        }
        return e.json(200, list);

    } catch (err) {
        return e.json(500, { error: "Failed to retrieve print details: " + err });
    }
});

routerAdd("GET", "/api/public/print-form", (e) => {
    const getParticipantPrintData = function (record) {
        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) {
                try {
                    expandedApprover = $app.findRecordById("_superusers", approvedBy);
                } catch (__) { }
            }
        }

        let expandedInst = null;
        const instRef = record.get("institution_ref");
        if (instRef) {
            try {
                expandedInst = $app.findRecordById("institutions", instRef);
            } catch (_) { }
        }

        return {
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
            juz_options: record.get("juzz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            status: record.get("status"),
            arrival_status: record.get("arrival_status") || "none",
            address: record.get("address") || "",
            registration_type: record.get("registration_type") || "individual",
            allocated_venue: record.get("allocated_venue"),
            allocated_order: record.get("allocated_order"),
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
                    contact_person: expandedInst.get("contact_person") || "N/A",
                    email: expandedInst.get("email"),
                    phone_number: expandedInst.get("phone_number") || expandedInst.get("whatsapp_number") || "N/A",
                    address: [
                        expandedInst.get("street_address"),
                        expandedInst.get("village_name"),
                        expandedInst.get("district_name"),
                        expandedInst.get("state_name"),
                        expandedInst.get("pincode")
                    ].filter(Boolean).join(", "),
                } : null
            }
        };
    };

    const info = e.requestInfo();
    const idParam = (info.query.id || "").trim();
    const dobParam = (info.query.dob || "").trim();

    if (!idParam) {
        return e.json(400, { error: "Missing required parameter: id" });
    }

    const ids = idParam.split(",").map(x => x.trim()).filter(x => x);
    const dobs = dobParam.split(",").map(x => x.trim()).filter(x => x);

    try {
        const list = [];
        for (let i = 0; i < ids.length; i++) {
            const record = $app.findRecordById("participants_application", ids[i]);
            if (record) {
                if (dobs.length > 0) {
                    const expectedDob = dobs[i] || dobs[0];
                    if ((record.get("dob") + "").indexOf(expectedDob) !== 0) {
                        continue;
                    }
                }
                list.push(getParticipantPrintData(record));
            }
        }

        if (list.length === 0) {
            return e.json(404, { error: "No authorized records found" });
        }

        if (list.length === 1) {
            return e.json(200, list[0]);
        }
        return e.json(200, list);

    } catch (err) {
        return e.json(500, { error: "Failed to retrieve print details: " + err });
    }
});

routerAdd("GET", "/api/admin/print-institution-students", (e) => {
    const getParticipantPrintData = function (record) {
        let expandedApprover = null;
        const approvedBy = record.get("approved_by");
        if (approvedBy) {
            try {
                expandedApprover = $app.findRecordById("users", approvedBy);
            } catch (_) {
                try {
                    expandedApprover = $app.findRecordById("_superusers", approvedBy);
                } catch (__) { }
            }
        }

        let expandedInst = null;
        const instRef = record.get("institution_ref");
        if (instRef) {
            try {
                expandedInst = $app.findRecordById("institutions", instRef);
            } catch (_) { }
        }

        return {
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
            juz_options: record.get("juzz_options"),
            selected_juz: record.get("selected_juz"),
            whatsapp_number: record.get("whatsapp_number"),
            email: record.get("email"),
            guardian_name: record.get("guardian_name"),
            guardian_phone: record.get("guardian_phone"),
            requires_accommodation: record.get("requires_accommodation"),
            status: record.get("status"),
            arrival_status: record.get("arrival_status") || "none",
            address: record.get("address") || "",
            registration_type: record.get("registration_type") || "individual",
            allocated_venue: record.get("allocated_venue"),
            allocated_order: record.get("allocated_order"),
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
                    contact_person: expandedInst.get("contact_person") || "N/A",
                    email: expandedInst.get("email"),
                    phone_number: expandedInst.get("phone_number") || expandedInst.get("whatsapp_number") || "N/A",
                    address: [
                        expandedInst.get("street_address"),
                        expandedInst.get("village_name"),
                        expandedInst.get("district_name"),
                        expandedInst.get("state_name"),
                        expandedInst.get("pincode")
                    ].filter(Boolean).join(", "),
                } : null
            }
        };
    };

    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";
    const isCoordinator = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "coordinators";

    if (!isSuperuser && !isAdmin && !isCoordinator) {
        return e.json(403, { error: "Unauthorized. Admin or coordinator access required." });
    }

    const info = e.requestInfo();
    const instId = (info.query.id || "").trim();

    if (!instId) {
        return e.json(400, { error: "Missing required parameter: id" });
    }

    try {
        const institution = $app.findRecordById("institutions", instId);
        if (!institution) {
            return e.json(404, { error: "Institution not found" });
        }

        const records = $app.findRecordsByFilter("participants_application", "institution_ref = '" + instId + "' && status = 'approved'", "", 9999, 0);

        const list30 = [];
        const list15 = [];
        const list5 = [];
        const other = [];

        for (let i = 0; i < records.length; i++) {
            const data = getParticipantPrintData(records[i]);
            if (data.category === "30_juz") {
                list30.push(data);
            } else if (data.category === "15_juz") {
                list15.push(data);
            } else if (data.category === "5_juz") {
                list5.push(data);
            } else {
                other.push(data);
            }
        }

        const sortByName = (a, b) => a.full_name.localeCompare(b.full_name);
        list30.sort(sortByName);
        list15.sort(sortByName);
        list5.sort(sortByName);
        other.sort(sortByName);

        const orderedApplications = [].concat(list30, list15, list5, other);

        return e.json(200, {
            institution: {
                id: institution.get("id"),
                institution_id: institution.get("institution_id"),
                name: institution.get("name"),
                contact_person: institution.get("contact_person"),
                email: institution.get("email"),
                phone_number: institution.get("phone_number") || institution.get("whatsapp_number") || "N/A",
                address: [
                    institution.get("street_address"),
                    institution.get("village_name"),
                    institution.get("district_name"),
                    institution.get("state_name"),
                    institution.get("pincode")
                ].filter(Boolean).join(", ")

            },
            applications: orderedApplications
        });

    } catch (err) {
        return e.json(500, { error: "Failed to retrieve institution print details: " + err });
    }
});

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
    const round = (info.query.round || "preliminary").trim();

    if (!venue) {
        return e.json(400, { error: "Missing venue parameter" });
    }

    try {
        let filter = "status = 'approved' && allocated_venue = {:venue}";
        let sort = "allocated_order";
        if (round === "final") {
            filter = "status = 'approved' && final_venue = {:venue}";
            sort = "final_order";
        }

        const params = { venue: venue };
        const records = $app.findRecordsByFilter("participants_application", filter, sort, 2000, 0, params);
        const list = [];

        records.forEach(record => {
            let expandedInst = null;
            const instRef = record.get("institution_ref");
            if (instRef) {
                try {
                    expandedInst = $app.findRecordById("institutions", instRef);
                } catch (_) { }
            }

            // Cleaned response body layout payload mapping fields matching your columns
            list.push({
                id: record.get("id"),
                participant_id: record.get("participant_id"),
                full_name: record.get("full_name"),
                category: record.get("category"),
                juzz_options: record.get("juzz_options"),
                selected_juz: record.get("selected_juz"),
                allocated_venue: round === "final" ? record.get("final_venue") : record.get("allocated_venue"),
                allocated_order: round === "final" ? record.get("final_order") : record.get("allocated_order"),

                // EXPLICITLY RETRIEVING THE CRITICAL ARRIVAL STATUS VALUE FOR THE TEMPLATE FILTERS
                arrival_status: record.get("arrival_status") || "none",

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