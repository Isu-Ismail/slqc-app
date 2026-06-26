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
        // Validation Check: Ensure no marks are entered or finalists chosen
        try {
            const prelimCountRes = $app.findRecordsByFilter("preliminary_marks", "id != ''", "", 1, 0);
            const finalCountRes = $app.findRecordsByFilter("final_marks", "id != ''", "", 1, 0);
            if (prelimCountRes.length > 0 || finalCountRes.length > 0) {
                return e.json(400, { error: "Action blocked: Marks have already been entered/submitted for participants." });
            }

            const finalistCountRes = $app.findRecordsByFilter("participants_application", "is_finalist = true", "", 1, 0);
            if (finalistCountRes.length > 0) {
                return e.json(400, { error: "Action blocked: Finalists have already been chosen." });
            }
        } catch (_) { }

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
        } catch (_) { }

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

        // Check A: Ensure all venues configured for this category have at least one judge allocated
        for (let i = 0; i < venues.length; i++) {
            const v = venues[i];
            const rawJudges = v.getString("judges");
            let venueJudges = [];
            if (rawJudges) {
                try {
                    venueJudges = JSON.parse(rawJudges);
                } catch (_) { }
            }
            if (!Array.isArray(venueJudges) || venueJudges.length === 0) {
                return e.json(400, { error: "Cannot run allocation: Venue '" + v.get("name") + "' does not have any judges allocated. Please allocate judges first." });
            }
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

        const hasConflict = (venueObj, studentInstId) => {
            if (!studentInstId) return false;
            let studentInstName = "";
            try {
                const instRec = $app.findRecordById("institutions", studentInstId);
                studentInstName = instRec.get("name");
            } catch (_) { }

            const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
            const sNameNorm = norm(studentInstName);
            const sIdNorm = norm(studentInstId);

            if (!sNameNorm && !sIdNorm) return false;

            const rawJudges = venueObj.record.getString("judges");
            if (rawJudges) {
                try {
                    const parsed = JSON.parse(rawJudges);
                    if (Array.isArray(parsed)) {
                        for (let i = 0; i < parsed.length; i++) {
                            const j = parsed[i];
                            if (j && typeof j === "object" && j.institution) {
                                const jInstNorm = norm(j.institution);
                                if (jInstNorm) {
                                    // Match exact or fuzzy/partial institution name
                                    if (jInstNorm === sIdNorm ||
                                        jInstNorm === sNameNorm ||
                                        sNameNorm.indexOf(jInstNorm) !== -1 ||
                                        jInstNorm.indexOf(sNameNorm) !== -1) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                } catch (_) { }
            }
            return false;
        };

        const allocateCandidate = (cand, instId) => {
            const availableTargets = venuesList.filter(v => v.allocatedCount < v.capacity);
            if (availableTargets.length === 0) return false;

            let nonConflictingTargets = availableTargets.filter(t => !hasConflict(t, instId));
            if (nonConflictingTargets.length === 0) {
                nonConflictingTargets = availableTargets;
            }

            let selectedTarget = null;
            let minInstCount = Infinity;

            nonConflictingTargets.forEach(t => {
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

        const sortedInsts = Object.keys(instGroups).sort((a, b) => instGroups[b].length - instGroups[a].length);

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

        // Spacing algorithm to keep candidates of the same institution apart
        const arrangeCandidates = (cands) => {
            if (cands.length <= 1) return cands;

            const groups = {};
            cands.forEach(c => {
                const inst = c.get("institution_ref") || "individual_" + c.get("id");
                if (!groups[inst]) groups[inst] = [];
                groups[inst].push(c);
            });

            const result = [];
            const lastPlacedInsts = [];

            const groupList = [];
            Object.keys(groups).forEach(inst => {
                groupList.push({
                    inst: inst,
                    list: groups[inst]
                });
            });

            const totalCount = cands.length;
            for (let step = 0; step < totalCount; step++) {
                const activeGroups = groupList.filter(g => g.list.length > 0);
                if (activeGroups.length === 0) break;

                activeGroups.sort((a, b) => b.list.length - a.list.length);

                let chosenGroup = null;
                for (let spacing = 3; spacing >= 0; spacing--) {
                    const disallowedInsts = spacing > 0 ? lastPlacedInsts.slice(-spacing) : [];
                    const candidateGroups = activeGroups.filter(g => !disallowedInsts.includes(g.inst));
                    if (candidateGroups.length > 0) {
                        chosenGroup = candidateGroups[0];
                        break;
                    }
                }

                if (!chosenGroup) {
                    chosenGroup = activeGroups[0];
                }

                const cand = chosenGroup.list.pop();
                result.push(cand);
                lastPlacedInsts.push(chosenGroup.inst);

                if (lastPlacedInsts.length > 10) {
                    lastPlacedInsts.shift();
                }
            }

            return result;
        };

        // Shuffle and arrange within each stage, then write sequential allocated_order to DB
        venuesList.forEach(venue => {
            const shuffledCands = shuffle(venue.allocatedCandidates);
            const arrangedCands = arrangeCandidates(shuffledCands);
            arrangedCands.forEach((cand, idx) => {
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
        } catch (_) { }

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
        // Validation Check: Ensure no marks are entered or finalists chosen
        try {
            const prelimCountRes = $app.findRecordsByFilter("preliminary_marks", "id != ''", "", 1, 0);
            const finalCountRes = $app.findRecordsByFilter("final_marks", "id != ''", "", 1, 0);
            if (prelimCountRes.length > 0 || finalCountRes.length > 0) {
                return e.json(400, { error: "Action blocked: Marks have already been entered/submitted for participants." });
            }

            const finalistCountRes = $app.findRecordsByFilter("participants_application", "is_finalist = true", "", 1, 0);
            if (finalistCountRes.length > 0) {
                return e.json(400, { error: "Action blocked: Finalists have already been chosen." });
            }
        } catch (_) { }

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
        } catch (_) { }

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
        } catch (_) { }

        return e.json(200, {
            success: true,
            message: "Venue allocation cleared for category " + category.replace("_", " ") + "."
        });

    } catch (err) {
        return e.json(500, { error: "Unallocation failed: " + err });
    }
});

// ── 3. Update Single Candidate Allocation ──────────────────────────────────────
routerAdd("POST", "/api/admin/update-candidate-allocation", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        let participantId = "";
        let venue = "";
        let order = 0;

        try {
            const info = e.requestInfo();
            const data = info.data || {};
            participantId = data.participantId || "";
            venue = data.allocated_venue || "";
            order = parseInt(data.allocated_order, 10) || 0;

            if (!participantId) {
                const body = new DynamicModel({
                    participantId: "",
                    allocated_venue: "",
                    allocated_order: 0
                });
                e.bindBody(body);
                participantId = body.participantId;
                venue = body.allocated_venue;
                order = parseInt(body.allocated_order, 10) || 0;
            }
        } catch (_) { }

        if (!participantId) {
            return e.json(400, { error: "Missing participantId parameter." });
        }

        const cand = $app.findRecordById("participants_application", participantId);
        const oldVenue = cand.get("allocated_venue") || "";
        const oldOrder = parseInt(cand.get("allocated_order"), 10) || 0;
        const newVenue = venue;
        let newOrder = order;

        if (oldVenue !== newVenue) {
            // Stage/Venue changed!
            // Put the candidate to the last in the destination stage
            if (newVenue !== "") {
                const destCands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && allocated_venue = {:venue}",
                    "allocated_order",
                    999999,
                    0,
                    { venue: newVenue }
                );
                // Last order is count + 1
                newOrder = destCands.length + 1;
            } else {
                newOrder = 0;
            }

            // Save candidate's new venue and order first
            cand.set("allocated_venue", newVenue);
            cand.set("allocated_order", newOrder);
            $app.save(cand);

            // Re-order remaining candidates in the old venue to remove the gap
            if (oldVenue !== "") {
                const srcCands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && allocated_venue = {:venue} && id != {:candId}",
                    "allocated_order",
                    999999,
                    0,
                    { venue: oldVenue, candId: participantId }
                );
                srcCands.forEach((c, idx) => {
                    c.set("allocated_order", idx + 1);
                    $app.save(c);
                });
            }
        } else {
            // Same venue, but order changed!
            if (newVenue !== "" && oldOrder !== newOrder) {
                // Fetch all other candidates in this venue
                const cands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && allocated_venue = {:venue} && id != {:candId}",
                    "allocated_order",
                    999999,
                    0,
                    { venue: newVenue, candId: participantId }
                );

                // Reconstruct the sorted list including the modified candidate at the new target position
                cands.sort((a, b) => (parseInt(a.get("allocated_order"), 10) || 0) - (parseInt(b.get("allocated_order"), 10) || 0));

                const newList = [];
                let inserted = false;

                // Insert at newOrder (1-based index)
                cands.forEach((c, idx) => {
                    const currentPos = idx + 1;
                    if (currentPos === newOrder) {
                        newList.push(cand);
                        inserted = true;
                    }
                    newList.push(c);
                });

                if (!inserted) {
                    newList.push(cand);
                }

                // Re-save all candidates in the list with sequential orders
                newList.forEach((c, idx) => {
                    c.set("allocated_order", idx + 1);
                    $app.save(c);
                });
            } else {
                // Just save it
                cand.set("allocated_venue", newVenue);
                cand.set("allocated_order", newOrder);
                $app.save(cand);
            }
        }

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) { }

        return e.json(200, {
            success: true,
            message: "Allocation updated successfully."
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update allocation: " + err });
    }
});

// ── 4. Run Automatic Final Round Venue Allocation ──────────────────────────────────
routerAdd("POST", "/api/admin/allocate-final-venues", (e) => {
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
        } catch (_) { }

        if (!category) {
            return e.json(400, { error: "Missing category parameter." });
        }

        // Find existing final venue record for this category
        let finalVenue = null;
        try {
            const venues = $app.findRecordsByFilter(
                "venue_detail",
                "round = 'final' && category = {:category}",
                "",
                1,
                0,
                { category: category }
            );
            if (venues && venues.length > 0) {
                finalVenue = venues[0];
            }
        } catch (_) { }

        if (!finalVenue) {
            return e.json(400, {
                error: "No final round venue found for category " + category.replace("_", " ") + ". Please configure the final round venue first."
            });
        }

        const venueName = finalVenue.get("name");

        // 1. Reset all previous final venue allocations for this category
        const oldAllocations = $app.findRecordsByFilter(
            "participants_application",
            "final_venue = {:venue}",
            "",
            9999,
            0,
            { venue: venueName }
        );
        oldAllocations.forEach(cand => {
            cand.set("final_venue", "");
            cand.set("final_order", 0);
            $app.save(cand);
        });

        // 2. Fetch all current approved finalists for the category
        const finalists = $app.findRecordsByFilter(
            "participants_application",
            "category = {:category} && is_finalist = true && status = 'approved'",
            "",
            100,
            0,
            { category: category }
        );

        if (finalists.length === 0) {
            return e.json(400, { error: "No promoted finalists found in the " + category.replace("_", " ") + " category. Please select/promote finalists first." });
        }

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

        // Convert slice/list to native JS array to ensure perfect array operations
        const nativeFinalists = [];
        finalists.forEach(f => nativeFinalists.push(f));

        // 3. Shuffle finalists randomly
        const shuffled = shuffle(nativeFinalists);

        // 4. Update database records sequentially (orders 1 to shuffled.length)
        shuffled.forEach((cand, idx) => {
            cand.set("final_venue", venueName);
            cand.set("final_order", idx + 1);
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
        } catch (_) { }

        return e.json(200, {
            success: true,
            message: "Final round venue allocation completed successfully.",
            summary: {
                [venueName]: {
                    category: category,
                    capacity: 10,
                    allocated: shuffled.length
                }
            }
        });

    } catch (err) {
        return e.json(500, { error: "Final allocation failed: " + err });
    }
});

// ── 5. Clear / Reset Final Round Venue Allocation ──────────────────────────────────
routerAdd("POST", "/api/admin/unallocate-final-venues", (e) => {
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
        } catch (_) { }

        if (!category) {
            return e.json(400, { error: "Missing category parameter." });
        }

        // Find existing final venue record for this category
        let finalVenue = null;
        try {
            const venues = $app.findRecordsByFilter(
                "venue_detail",
                "round = 'final' && category = {:category}",
                "",
                1,
                0,
                { category: category }
            );
            if (venues && venues.length > 0) {
                finalVenue = venues[0];
            }
        } catch (_) { }

        if (!finalVenue) {
            return e.json(400, {
                error: "No final round venue found for category " + category.replace("_", " ") + ". Please configure the final round venue first."
            });
        }

        const venueName = finalVenue.get("name");

        // Reset all candidates allocated to this final venue (no matter is_finalist status)
        const cands = $app.findRecordsByFilter(
            "participants_application",
            "final_venue = {:venue}",
            "",
            999999,
            0,
            { venue: venueName }
        );

        cands.forEach(cand => {
            cand.set("final_venue", "");
            cand.set("final_order", 0);
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
        } catch (_) { }

        return e.json(200, {
            success: true,
            message: "Final round venue allocation cleared."
        });

    } catch (err) {
        return e.json(500, { error: "Unallocation failed: " + err });
    }
});

// ── 6. Update Single Final Candidate Allocation ───────────────────────────────────
routerAdd("POST", "/api/admin/update-final-candidate-allocation", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        let participantId = "";
        let venue = "";
        let order = 0;

        try {
            const info = e.requestInfo();
            const data = info.data || {};
            participantId = data.participantId || "";
            venue = data.final_venue || "";
            order = parseInt(data.final_order, 10) || 0;

            if (!participantId) {
                const body = new DynamicModel({
                    participantId: "",
                    final_venue: "",
                    final_order: 0
                });
                e.bindBody(body);
                participantId = body.participantId;
                venue = body.final_venue;
                order = parseInt(body.final_order, 10) || 0;
            }
        } catch (_) { }

        if (!participantId) {
            return e.json(400, { error: "Missing participantId parameter." });
        }

        const cand = $app.findRecordById("participants_application", participantId);
        const oldVenue = cand.get("final_venue") || "";
        const oldOrder = parseInt(cand.get("final_order"), 10) || 0;
        const newVenue = venue;
        let newOrder = order;

        if (oldVenue !== newVenue) {
            if (newVenue !== "") {
                const destCands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && is_finalist = true && final_venue = {:venue}",
                    "final_order",
                    100,
                    0,
                    { venue: newVenue }
                );
                newOrder = destCands.length + 1;
            } else {
                newOrder = 0;
            }

            cand.set("final_venue", newVenue);
            cand.set("final_order", newOrder);
            $app.save(cand);

            if (oldVenue !== "") {
                const srcCands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && is_finalist = true && final_venue = {:venue} && id != {:candId}",
                    "final_order",
                    100,
                    0,
                    { venue: oldVenue, candId: participantId }
                );
                srcCands.forEach((c, idx) => {
                    c.set("final_order", idx + 1);
                    $app.save(c);
                });
            }
        } else {
            if (newVenue !== "" && oldOrder !== newOrder) {
                const cands = $app.findRecordsByFilter(
                    "participants_application",
                    "status = 'approved' && is_finalist = true && final_venue = {:venue} && id != {:candId}",
                    "final_order",
                    100,
                    0,
                    { venue: newVenue, candId: participantId }
                );

                cands.sort((a, b) => (parseInt(a.get("final_order"), 10) || 0) - (parseInt(b.get("final_order"), 10) || 0));

                const newList = [];
                let inserted = false;

                cands.forEach((c, idx) => {
                    const currentPos = idx + 1;
                    if (currentPos === newOrder) {
                        newList.push(cand);
                        inserted = true;
                    }
                    newList.push(c);
                });

                if (!inserted) {
                    newList.push(cand);
                }

                newList.forEach((c, idx) => {
                    c.set("final_order", idx + 1);
                    $app.save(c);
                });
            } else {
                cand.set("final_venue", newVenue);
                cand.set("final_order", newOrder);
                $app.save(cand);
            }
        }

        // Update trigger manually for real-time tracking
        try {
            const triggerCol = $app.findCollectionByNameOrId("trigger_collection");
            if (triggerCol) {
                const tr = $app.findFirstRecordByData("trigger_collection", "column_name", "participants_application");
                tr.set("random_value", $security.randomString(10));
                $app.save(tr);
            }
        } catch (_) { }

        return e.json(200, {
            success: true,
            message: "Allocation updated successfully."
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update allocation: " + err });
    }
});
