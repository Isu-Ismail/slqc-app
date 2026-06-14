// pocketbase/pb_hooks/admin_api_allocation.pb.js

// ── 1. Run Automatic Venue Allocation ─────────────────────────────────────────
routerAdd("POST", "/api/admin/allocate-venues", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        let category = "";
        try {
            const info = e.requestInfo();
            const data = info.data || {};
            category = data.category || "";
            
            if (!category) {
                const body = new DynamicModel({
                    category: ""
                });
                e.bindBody(body);
                category = body.category;
            }
        } catch (_) {}

        if (!category) {
            return e.json(400, { error: "Missing category parameter." });
        }

        if (category !== "5_juz" && category !== "15_juz" && category !== "30_juz") {
            return e.json(400, { error: "Invalid category. Must be '5_juz', '15_juz', or '30_juz'." });
        }

        // 0. Validation Check: Ensure registration status is closed for both individual and madrasa
        const checkStatusClosed = (keyName) => {
            try {
                const rec = $app.findFirstRecordByData("metadata", "key", keyName);
                const val = JSON.parse(rec.get("value") || "{}");
                return val.status === "closed";
            } catch (_) {
                return false;
            }
        };

        if (!checkStatusClosed("participant_application_status") || !checkStatusClosed("madrasa_application_status")) {
            return e.json(400, {
                error: "Cannot run allocation while registration is open. Both individual and institution registration statuses must be closed first."
            });
        }

        // 1. Validation Check: Ensure NO pending or reapplied applications exist for the specified category
        const pendingCount = $app.findRecordsByFilter(
            "participants_application",
            "category = '" + category + "' && (status = 'pending' || status = 'reapplied')",
            "",
            1,
            0
        ).length;

        if (pendingCount > 0) {
            return e.json(400, {
                error: "Cannot run allocation while there are pending or reapplied applications for " + category.replace("_", " ") + ". Please approve or reject all candidates in this category first."
            });
        }

        // 2. Fetch venues configured for the specified category
        const venues = $app.findRecordsByFilter("venue_detail", "category = '" + category + "'", "", 9999, 0);
        if (!venues || venues.length === 0) {
            return e.json(400, { error: "No venues configured for category " + category.replace("_", " ") + ". Please create venues first." });
        }

        // 3. Fetch all approved participants for the specified category
        const approvedCandidates = $app.findRecordsByFilter(
            "participants_application",
            "status = 'approved' && category = '" + category + "'",
            "",
            999999,
            0
        );

        if (!approvedCandidates || approvedCandidates.length === 0) {
            return e.json(400, {
                error: "No approved candidates found in the " + category.replace("_", " ") + " category. There is nothing to allocate."
            });
        }

        // 4. Reset all previous allocations for this category
        approvedCandidates.forEach(cand => {
            cand.set("allocated_venue", "");
            cand.set("allocated_slot", "");
            $app.save(cand);
        });

        // 5. Group venues (flattened into slots) by category
        const venuesByCat = [];

        venues.forEach(v => {
            let slotsVal = [];
            try {
                const rawSlots = v.get("slots");
                if (rawSlots) {
                    slotsVal = typeof rawSlots === 'string' ? JSON.parse(rawSlots) : rawSlots;
                }
            } catch (_) {}

            // Fallback to general slot if no slots defined
            if (!Array.isArray(slotsVal) || slotsVal.length === 0) {
                slotsVal = [{
                    name: "General Slot",
                    time: "08:00 AM - 05:00 PM",
                    capacity: parseInt(v.get("capacity"), 10) || 20
                }];
            }

            slotsVal.forEach((slot, idx) => {
                venuesByCat.push({
                    record: v,
                    id: v.get("id"),
                    name: v.get("name"),
                    slotName: slot.name || ("Slot " + (idx + 1)),
                    slotTime: slot.time || "",
                    capacity: parseInt(slot.capacity, 10) || 18,
                    allocatedCount: 0,
                    instCounts: {} // institution_ref -> count
                });
            });
        });

        // 6. Capacity Check
        const totalCap = venuesByCat.reduce((sum, v) => sum + v.capacity, 0);
        if (approvedCandidates.length > totalCap) {
            return e.json(400, {
                error: "Insufficient capacity for category '" + category.replace("_", " ") + "'. Candidates: " + approvedCandidates.length + ", Max Capacity: " + totalCap
            });
        }

        const allocationSummary = {};

        // Helper function to shuffle an array
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        };

        // 7. Run allocation
        // Group candidates by institution
        const instGroups = {}; // institution_ref -> candidates[]
        const individualCands = [];

        approvedCandidates.forEach(cand => {
            const instRef = cand.get("institution_ref") || "";
            if (instRef) {
                if (!instGroups[instRef]) instGroups[instRef] = [];
                instGroups[instRef].push(cand);
            } else {
                individualCands.push(cand);
            }
        });

        // Shuffle candidates within each institution grouping
        Object.keys(instGroups).forEach(instRef => {
            instGroups[instRef] = shuffle(instGroups[instRef]);
        });
        const shuffledIndividuals = shuffle(individualCands);

        // Sort institutions by size descending
        const sortedInsts = Object.keys(instGroups).sort((a, b) => instGroups[b].length - instGroups[a].length);

        const allocateCandidate = (cand, instId) => {
            // Find all slot targets with remaining capacity
            const availableTargets = venuesByCat.filter(v => v.allocatedCount < v.capacity);
            if (availableTargets.length === 0) return false;

            // Find slot target with minimum count of students from this institution
            let selectedTarget = null;
            let minInstCount = Infinity;

            availableTargets.forEach(t => {
                const instCount = t.instCounts[instId] || 0;
                if (instCount < minInstCount) {
                    minInstCount = instCount;
                    selectedTarget = t;
                } else if (instCount === minInstCount) {
                    // Tie breaker: pick slot target with more remaining capacity
                    const remCapNew = t.capacity - t.allocatedCount;
                    const remCapSelected = selectedTarget ? (selectedTarget.capacity - selectedTarget.allocatedCount) : 0;
                    if (remCapNew > remCapSelected) {
                        selectedTarget = t;
                    }
                }
            });

            if (selectedTarget) {
                // Update DB record
                cand.set("allocated_venue", selectedTarget.name);
                const slotStr = selectedTarget.slotName + (selectedTarget.slotTime ? " (" + selectedTarget.slotTime + ")" : "");
                cand.set("allocated_slot", slotStr);
                $app.save(cand);

                // Update memory state
                selectedTarget.allocatedCount++;
                if (instId) {
                    selectedTarget.instCounts[instId] = (selectedTarget.instCounts[instId] || 0) + 1;
                }
                return true;
            }
            return false;
        };

        // Process larger institutions first
        sortedInsts.forEach(instRef => {
            const list = instGroups[instRef];
            list.forEach(cand => {
                allocateCandidate(cand, instRef);
            });
        });

        // Process individual candidates
        shuffledIndividuals.forEach(cand => {
            allocateCandidate(cand, "");
        });

        // Populate summary
        venuesByCat.forEach(s => {
            const key = s.name + " - " + s.slotName;
            allocationSummary[key] = {
                category: category,
                capacity: s.capacity,
                allocated: s.allocatedCount
            };
        });

        // 8. Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) {}

        return e.json(200, {
            success: true,
            message: "Venue allocation completed successfully.",
            summary: allocationSummary
        });

    } catch (err) {
        return e.json(500, { error: "Allocation failed: " + err });
    }
});

// ── 2. Clear / Reset Venue Allocation ─────────────────────────────────────────
routerAdd("POST", "/api/admin/unallocate-venues", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        let category = "";
        try {
            const info = e.requestInfo();
            const data = info.data || {};
            category = data.category || "";
            
            if (!category) {
                const body = new DynamicModel({
                    category: ""
                });
                e.bindBody(body);
                category = body.category;
            }
        } catch (_) {}

        if (!category) {
            return e.json(400, { error: "Missing category parameter." });
        }

        if (category !== "5_juz" && category !== "15_juz" && category !== "30_juz") {
            return e.json(400, { error: "Invalid category. Must be '5_juz', '15_juz', or '30_juz'." });
        }

        // Fetch all candidates for the specified category
        const candidates = $app.findRecordsByFilter(
            "participants_application",
            "category = '" + category + "' && (allocated_venue != '' || allocated_slot != '')",
            "",
            999999,
            0
        );

        candidates.forEach(cand => {
            cand.set("allocated_venue", "");
            cand.set("allocated_slot", "");
            $app.save(cand);
        });

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
            success: true,
            message: "Venue allocation cleared for category " + category.replace("_", " ") + "."
        });

    } catch (err) {
        return e.json(500, { error: "Unallocation failed: " + err });
    }
});
