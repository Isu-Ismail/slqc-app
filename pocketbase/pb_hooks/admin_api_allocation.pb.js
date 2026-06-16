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
            cand.set("allocated_order", 0);
            $app.save(cand);
        });

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

        // 5. Build venues list with capacity allocation rules
        const totalCandidates = approvedCandidates.length;
        const numVenues = venues.length;
        const venuesList = [];

        venues.forEach(v => {
            const cap = parseInt(v.get("capacity"), 10) || 0;
            venuesList.push({
                record: v,
                id: v.get("id"),
                name: v.get("name"),
                configuredCapacity: cap,
                capacity: cap || 0, // set dynamic share below if empty
                allocatedCount: 0,
                instCounts: {}, // institution_ref -> count
                allocatedCandidates: [] // track assigned cands
            });
        });

        // If capacity is kept empty (0), distribute remainder equally
        let filledCapTotal = 0;
        let emptyStagesCount = 0;
        venuesList.forEach(v => {
            if (v.configuredCapacity > 0) {
                filledCapTotal += v.configuredCapacity;
            } else {
                emptyStagesCount++;
            }
        });

        if (emptyStagesCount > 0) {
            const remainder = Math.max(0, totalCandidates - filledCapTotal);
            const equalShare = Math.ceil(remainder / emptyStagesCount);
            venuesList.forEach(v => {
                if (v.configuredCapacity <= 0) {
                    v.capacity = equalShare;
                }
            });
        }

        // 6. Capacity Check
        const totalCap = venuesList.reduce((sum, v) => sum + v.capacity, 0);
        if (totalCandidates > totalCap) {
            return e.json(400, {
                error: "Insufficient capacity for category '" + category.replace("_", " ") + "'. Candidates: " + totalCandidates + ", Max Capacity: " + totalCap
            });
        }

        // 7. Group candidates by institution
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
            const availableTargets = venuesList.filter(v => v.allocatedCount < v.capacity);
            if (availableTargets.length === 0) return false;

            let selectedTarget = null;
            let minInstCount = Infinity;

            availableTargets.forEach(t => {
                const instCount = t.instCounts[instId] || 0;
                if (instCount < minInstCount) {
                    minInstCount = instCount;
                    selectedTarget = t;
                } else if (instCount === minInstCount) {
                    const countNew = t.allocatedCount;
                    const countSelected = selectedTarget ? selectedTarget.allocatedCount : Infinity;
                    if (countNew < countSelected) {
                        selectedTarget = t;
                    } else if (countNew === countSelected) {
                        const remCapNew = t.capacity - t.allocatedCount;
                        const remCapSelected = selectedTarget ? (selectedTarget.capacity - selectedTarget.allocatedCount) : 0;
                        if (remCapNew > remCapSelected) {
                            selectedTarget = t;
                        }
                    }
                }
            });

            if (selectedTarget) {
                selectedTarget.allocatedCandidates.push(cand);
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

        // Shuffle within each stage and write sequential allocated_order to DB
        venuesList.forEach(venue => {
            const shuffledCands = shuffle(venue.allocatedCandidates);
            shuffledCands.forEach((cand, idx) => {
                cand.set("allocated_venue", venue.name);
                cand.set("allocated_order", idx + 1);
                $app.save(cand);
            });
        });

        const allocationSummary = {};
        venuesList.forEach(v => {
            allocationSummary[v.name] = {
                category: category,
                capacity: v.capacity,
                allocated: v.allocatedCount
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
            "category = '" + category + "' && (allocated_venue != '' || allocated_order > 0)",
            "",
            999999,
            0
        );

        candidates.forEach(cand => {
            cand.set("allocated_venue", "");
            cand.set("allocated_order", 0);
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
