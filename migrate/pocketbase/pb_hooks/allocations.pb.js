// pocketbase/pb_hooks/allocations.pb.js
//
// CUSTOM ROUTE: POST /api/admin-allocate
// Allocates a batch of pending, unallocated applications to a specific coordinator.

routerAdd("POST", "/api/admin-allocate", (e) => {
    // 1. Verify admin authorization
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    // 2. Parse request body
    const body = new DynamicModel({
        coordinator_id: "",
        count: 0,
        type: "" // 'individual' or 'institution'
    });
    
    e.bindBody(body);

    const coordinatorId = body.coordinator_id;
    const count = parseInt(body.count, 10);
    const type = body.type;

    if (!coordinatorId || isNaN(count) || count <= 0 || (type !== 'individual' && type !== 'institution')) {
        return e.json(400, { error: "Invalid payload parameters" });
    }

    const collectionName = type === 'individual' ? 'participants_application' : 'institutions';

    try {
        // 3. Find pending and unassigned applications
        // `approved_by` should be empty, and status should be 'pending'.
        const records = $app.findRecordsByFilter(
            collectionName,
            "status = 'pending' && (approved_by = '' || approved_by = null)",
            "created", // oldest first
            count,
            0
        );

        if (!records || records.length === 0) {
            return e.json(200, { success: true, allocated: 0, message: "No pending applications to allocate" });
        }

        let allocatedCount = 0;
        
        // 4. Update each record in a transaction if possible, or loop
        $app.runInTransaction((txApp) => {
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                record.set("approved_by", coordinatorId);
                txApp.save(record);
                allocatedCount++;
            }
        });

        return e.json(200, { success: true, allocated: allocatedCount, message: `Successfully allocated ${allocatedCount} applications.` });

    } catch (err) {
        console.error("Admin allocation route error: " + err);
        return e.json(500, { error: "Allocation failed: " + err });
    }
});
