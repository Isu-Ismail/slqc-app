// pocketbase/pb_hooks/unallocate.pb.js
//
// CUSTOM ROUTE: POST /api/admin-unallocate
// Clears the approved_by field for all pending applications assigned to a specific coordinator.

routerAdd("POST", "/api/admin-unallocate", (e) => {
    // 1. Verify admin authorization
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    // 2. Parse request body
    const body = new DynamicModel({
        coordinator_id: "",
        type: "" // 'individual' or 'institution'
    });
    
    e.bindBody(body);

    const coordinatorId = body.coordinator_id;
    const type = body.type;

    if (!coordinatorId || (type !== 'individual' && type !== 'institution')) {
        return e.json(400, { error: "Invalid payload parameters" });
    }

    const collectionName = type === 'individual' ? 'participants_application' : 'institutions';

    try {
        // 3. Find pending applications assigned to this coordinator
        const records = $app.findRecordsByFilter(
            collectionName,
            `status = 'pending' && approved_by = '${coordinatorId}'`,
            "-created", // doesn't matter, we want all of them
            1000, // limit to a high number per request
            0
        );

        if (!records || records.length === 0) {
            return e.json(200, { success: true, unallocated: 0, message: "No pending applications found assigned to this coordinator." });
        }

        let unallocatedCount = 0;
        
        // 4. Update each record in a transaction if possible, or loop
        $app.runInTransaction((txApp) => {
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                record.set("approved_by", ""); // clear allocation
                txApp.save(record);
                unallocatedCount++;
            }
        });

        return e.json(200, { success: true, unallocated: unallocatedCount, message: `Successfully unallocated ${unallocatedCount} applications.` });

    } catch (err) {
        console.error("Admin unallocate route error: " + err);
        return e.json(500, { error: "Unallocation failed: " + err });
    }
});
