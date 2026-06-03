// pocketbase/pb_hooks/allocations.pb.js

// =======================================================================
// 1. CUSTOM ROUTE: POST /api/admin-allocate
// Allocates a batch of pending, unallocated applications to a specific coordinator.
// =======================================================================
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

        // 4. Update each record in a transaction
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

// =======================================================================
// 2. CUSTOM ROUTE: POST /api/auto-allocate
// Evenly distributes all pending applications among all users. 
// If uneven, coordinators receive the extra applications over admins.
// =======================================================================
routerAdd("POST", "/api/auto-allocate", (e) => {
    // 1. Verify admin authorization
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    // 2. Parse request body
    const body = new DynamicModel({
        type: "" // 'individual' or 'institution'
    });

    e.bindBody(body);
    const type = body.type;

    if (type !== 'individual' && type !== 'institution') {
        return e.json(400, { error: "Invalid payload parameters. Type must be 'individual' or 'institution'." });
    }

    const collectionName = type === 'individual' ? 'participants_application' : 'institutions';

    try {
        // 3. Fetch ALL pending, unassigned applications (Using a high limit like 10000)
        const apps = $app.findRecordsByFilter(
            collectionName,
            "status = 'pending' && (approved_by = '' || approved_by = null)",
            "created",
            10000,
            0
        );

        if (!apps || apps.length === 0) {
            return e.json(200, { success: true, allocated: 0, message: "No pending applications available to auto-allocate." });
        }

        // 4. Fetch ALL users and sort them (Coordinators first, Admins last)
        const allUsers = $app.findRecordsByFilter("users", "1=1", "created", 1000, 0);

        if (!allUsers || allUsers.length === 0) {
            return e.json(400, { error: "No users found in the system to allocate to." });
        }

        let coordinators = [];
        let admins = [];

        for (let i = 0; i < allUsers.length; i++) {
            const user = allUsers[i];
            if (user.get("designation") === "admin") {
                admins.push(user.id);
            } else {
                coordinators.push(user.id);
            }
        }

        // Combine arrays: Coordinators sit at the front of the line
        const orderedUserIds = [...coordinators, ...admins];
        const totalUsers = orderedUserIds.length;
        const totalApps = apps.length;

        // 5. Calculate distribution math
        const baseCount = Math.floor(totalApps / totalUsers);
        const remainder = totalApps % totalUsers;

        // 6. Execute the allocation in a single transaction
        let appIndex = 0;
        let allocatedCount = 0;

        $app.runInTransaction((txApp) => {
            for (let i = 0; i < totalUsers; i++) {
                const userId = orderedUserIds[i];

                // If this user is within the "remainder" index, they get +1 extra application
                const countForThisUser = baseCount + (i < remainder ? 1 : 0);

                // Assign the calculated number of applications to this specific user
                for (let k = 0; k < countForThisUser; k++) {
                    if (appIndex < totalApps) {
                        const record = apps[appIndex];
                        record.set("approved_by", userId);
                        txApp.save(record);
                        appIndex++;
                        allocatedCount++;
                    }
                }
            }
        });

        return e.json(200, {
            success: true,
            allocated: allocatedCount,
            message: `Successfully auto-allocated ${allocatedCount} applications across ${totalUsers} users.`
        });

    } catch (err) {
        console.error("Auto-allocation route error: " + err);
        return e.json(500, { error: "Auto-allocation failed: " + err });
    }
});

// =======================================================================
// 3. CUSTOM ROUTE: GET /api/unallocated-count
// Returns the count of pending, unallocated applications.
// =======================================================================
routerAdd("GET", "/api/unallocated-count", (e) => {
    // 1. Verify admin authorization
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    // Optional: read type from query params (e.g., ?type=individual)
    const typeParam = e.request.url.query().get("type");

    try {
        let individualCount = 0;
        let institutionCount = 0;
        const filterStr = "status = 'pending' && (approved_by = '' || approved_by = null)";

        // Count individuals if requested or if no specific type is provided
        if (!typeParam || typeParam === 'individual') {
            const records = $app.findRecordsByFilter("participants_application", filterStr, "", 10000, 0);
            individualCount = records ? records.length : 0;
        }

        // Count institutions if requested or if no specific type is provided
        if (!typeParam || typeParam === 'institution') {
            const records = $app.findRecordsByFilter("institutions", filterStr, "", 10000, 0);
            institutionCount = records ? records.length : 0;
        }

        return e.json(200, {
            success: true,
            individual: individualCount,
            institution: institutionCount,
            total: individualCount + institutionCount
        });

    } catch (err) {
        console.error("Unallocated count route error: " + err);
        return e.json(500, { error: "Failed to fetch counts: " + err });
    }
});