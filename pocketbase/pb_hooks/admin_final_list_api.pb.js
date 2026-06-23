// pocketbase/pb_hooks/admin_final_list_api.pb.js

routerAdd("GET", "/api/admin/finalist/preliminary-leaderboard", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }

    const info = e.requestInfo();
    const category = (info.query.category || "5_juz").trim();

    try {
        // Fetch all approved and present participants in the category
        const filterString = "status = 'approved' && arrival_status != 'absent' && category = {:category}";
        const students = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            2000,
            0,
            { category: category }
        );

        const leaderboard = [];

        students.forEach(student => {
            let grandTotal = 0;
            let grandAverage = 0;
            let isFrozen = false;

            try {
                const markRec = $app.findFirstRecordByData("preliminary_marks", "participant_ref", student.get("id"));
                isFrozen = markRec.get("is_frozen") === true;
                
                const valStr = markRec.getString("values");
                if (valStr) {
                    const parsed = JSON.parse(valStr);
                    if (parsed && parsed.totals) {
                        grandTotal = parseFloat(parsed.totals.grandTotal) || 0;
                        grandAverage = parseFloat(parsed.totals.grandAverage) || 0;
                    }
                }
            } catch (_) {}

            leaderboard.push({
                participant_id: student.get("id"),
                register_id: student.get("participant_id"),
                full_name: student.get("full_name"),
                category: student.get("category"),
                grand_total: grandTotal,
                grand_average: grandAverage,
                is_frozen: isFrozen,
                is_finalist: student.get("is_finalist") === true,
                final_venue: student.get("final_venue") || "",
                final_order: student.getInt("final_order") || 0
            });
        });

        // Sort: grand_average DESC, grand_total DESC, register_id ASC
        leaderboard.sort((a, b) => {
            if (b.grand_average !== a.grand_average) {
                return b.grand_average - a.grand_average;
            }
            if (b.grand_total !== a.grand_total) {
                return b.grand_total - a.grand_total;
            }
            return a.register_id.localeCompare(b.register_id);
        });

        return e.json(200, { items: leaderboard });
    } catch (err) {
        return e.json(500, { error: "Failed to load leaderboard: " + err });
    }
});

routerAdd("POST", "/api/admin/finalist/promote-to-final", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Access denied. Only administrators can promote finalists." });
    }

    let category = "5_juz";
    let promotedIdsInput = null;

    try {
        const body = new DynamicModel({
            category: "5_juz",
            promoted_ids: []
        });
        e.bindBody(body);
        category = (body.category || "5_juz").trim();
        promotedIdsInput = body.promoted_ids;
        console.log("[promote-to-final] Successfully bound body. Category: " + category + ", promoted_ids count: " + (promotedIdsInput ? promotedIdsInput.length : 0));
    } catch (err) {
        console.log("[promote-to-final] Error binding body: " + err);
    }

    try {
        // Fetch all approved and present participants in the category
        const filterString = "status = 'approved' && arrival_status != 'absent' && category = {:category}";
        const students = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            2000,
            0,
            { category: category }
        );

        if (students.length === 0) {
            return e.json(400, { error: "No participants found in this category." });
        }

        const scoringList = [];
        let unfrozenCount = 0;

        students.forEach(student => {
            let grandTotal = 0;
            let grandAverage = 0;
            let isFrozen = false;

            try {
                const markRec = $app.findFirstRecordByData("preliminary_marks", "participant_ref", student.get("id"));
                isFrozen = markRec.get("is_frozen") === true;
                
                const valStr = markRec.getString("values");
                if (valStr) {
                    const parsed = JSON.parse(valStr);
                    if (parsed && parsed.totals) {
                        grandTotal = parseFloat(parsed.totals.grandTotal) || 0;
                        grandAverage = parseFloat(parsed.totals.grandAverage) || 0;
                    }
                }
            } catch (_) {}

            if (!isFrozen) {
                unfrozenCount++;
            }

            scoringList.push({
                record: student,
                grand_total: grandTotal,
                grand_average: grandAverage,
                register_id: student.get("participant_id")
            });
        });

        // Enforce that all present students must have frozen marks
        if (unfrozenCount > 0) {
            return e.json(400, { error: `Cannot promote finalists: ${unfrozenCount} participants do not have frozen preliminary marks.` });
        }

        // Promoted IDs list
        const promotedIds = [];
        if (Array.isArray(promotedIdsInput) && promotedIdsInput.length > 0) {
            // Use client-provided selection (e.g. resolved ties)
            promotedIdsInput.forEach(id => {
                if (id) promotedIds.push(String(id));
            });
        } else {
            // Sort to identify the top 10
            scoringList.sort((a, b) => {
                if (b.grand_average !== a.grand_average) {
                    return b.grand_average - a.grand_average;
                }
                if (b.grand_total !== a.grand_total) {
                    return b.grand_total - a.grand_total;
                }
                return a.register_id.localeCompare(b.register_id);
            });

            for (let i = 0; i < Math.min(10, scoringList.length); i++) {
                promotedIds.push(scoringList[i].record.get("id"));
            }
        }

        // Transactional update: save finalist state
        $app.runInTransaction((txApp) => {
            students.forEach(student => {
                const isFinalist = promotedIds.includes(student.get("id"));
                student.set("is_finalist", isFinalist);
                txApp.save(student);
            });
        });

        return e.json(200, { success: true, promoted_count: promotedIds.length });
    } catch (err) {
        return e.json(500, { error: "Failed to promote finalists: " + err });
    }
});

routerAdd("GET", "/api/admin/finalist/final-leaderboard", (e) => {
    const authRecord = e.auth;
    if (!authRecord || (authRecord.get("designation") !== "admin" && authRecord.get("designation") !== "coordinators")) {
        return e.json(403, { error: "Unauthorized access." });
    }

    const info = e.requestInfo();
    const category = (info.query.category || "5_juz").trim();

    try {
        // Fetch all finalists in this category
        const filterString = "status = 'approved' && arrival_status != 'absent' && category = {:category} && is_finalist = true";
        const finalists = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            100,
            0,
            { category: category }
        );

        const leaderboard = [];
        let allCompleted = finalists.length > 0;

        finalists.forEach(student => {
            var grandTotal = 0;
            var grandAverage = 0;
            var isFrozen = false;
            var hasMarks = false;
            var existingValues = {};

            try {
                const markRec = $app.findFirstRecordByData("final_marks", "participant_ref", student.get("id"));
                isFrozen = markRec.get("is_frozen") === true;
                hasMarks = true;
                
                const valStr = markRec.getString("values");
                if (valStr) {
                    existingValues = JSON.parse(valStr || "{}");
                    if (existingValues && existingValues.totals) {
                        grandTotal = parseFloat(existingValues.totals.grandTotal) || 0;
                        grandAverage = parseFloat(existingValues.totals.grandAverage) || 0;
                    }
                }
            } catch (_) {}

            if (!isFrozen) {
                allCompleted = false;
            }

            leaderboard.push({
                participant_id: student.get("id"),
                register_id: student.get("participant_id"),
                full_name: student.get("full_name"),
                category: student.get("category"),
                grand_total: grandTotal,
                grand_average: grandAverage,
                is_frozen: isFrozen,
                has_marks: hasMarks,
                values: existingValues,
                final_ranking: student.getInt("final_ranking")
            });
        });

        // Sort finalists by final marks
        leaderboard.sort((a, b) => {
            if (b.grand_average !== a.grand_average) {
                return b.grand_average - a.grand_average;
            }
            if (b.grand_total !== a.grand_total) {
                return b.grand_total - a.grand_total;
            }
            return a.register_id.localeCompare(b.register_id);
        });

        // Winners list
        let winners = null;
        if (allCompleted && leaderboard.length >= 1) {
            winners = {
                firstPlace: leaderboard[0] || null,
                secondPlace: leaderboard[1] || null,
                thirdPlace: leaderboard[2] || null
            };
        }

        return e.json(200, {
            items: leaderboard,
            winners_declared: allCompleted && leaderboard.length >= 1,
            winners: winners
        });
    } catch (err) {
        return e.json(500, { error: "Failed to load final round leaderboard: " + err });
    }
});

routerAdd("POST", "/api/admin/finalist/revert-promotion", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Access denied. Only administrators can revert promotions." });
    }

    let category = "5_juz";
    try {
        const body = new DynamicModel({
            category: "5_juz"
        });
        e.bindBody(body);
        category = (body.category || "5_juz").trim();
    } catch (_) {}

    try {
        const filterString = "status = 'approved' && arrival_status != 'absent' && category = {:category}";
        const students = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            2000,
            0,
            { category: category }
        );

        let hasAllocation = false;
        students.forEach(student => {
            if (student.get("is_finalist") === true) {
                const venueVal = student.get("final_venue");
                const orderVal = student.getInt("final_order");
                if (venueVal && venueVal !== "" && orderVal > 0) {
                    hasAllocation = true;
                }
            }
        });

        if (hasAllocation) {
            return e.json(400, { error: "Cannot revert promotion because final venue allocation has already been done for this category." });
        }

        $app.runInTransaction((txApp) => {
            students.forEach(student => {
                student.set("is_finalist", false);
                txApp.save(student);
            });
        });

        return e.json(200, { success: true, message: "Successfully reverted finalist promotion." });
    } catch (err) {
        return e.json(500, { error: "Failed to revert finalist promotion: " + err });
    }
});

routerAdd("POST", "/api/admin/finalist/issue-rankings", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Access denied. Only administrators can issue rankings." });
    }

    let category = "5_juz";
    let rankings = [];

    try {
        const body = new DynamicModel({
            category: "5_juz",
            rankings: []
        });
        e.bindBody(body);
        category = (body.category || "5_juz").trim();
        rankings = body.rankings;
    } catch (err) {
        return e.json(400, { error: "Invalid request body: " + err });
    }

    try {
        if (!Array.isArray(rankings) || rankings.length === 0) {
            return e.json(400, { error: "Rankings array is required and cannot be empty." });
        }

        $app.runInTransaction((txApp) => {
            rankings.forEach(item => {
                if (item && item.participant_id) {
                    const student = txApp.findRecordById("participants_application", item.participant_id);
                    student.set("final_ranking", parseInt(item.rank, 10) || 0);
                    txApp.save(student);
                }
            });
        });

        return e.json(200, { success: true, message: "Successfully issued final round rankings." });
    } catch (err) {
        return e.json(500, { error: "Failed to issue rankings: " + err });
    }
});

routerAdd("POST", "/api/admin/finalist/revert-rankings", (e) => {
    const authRecord = e.auth;
    if (!authRecord || authRecord.get("designation") !== "admin") {
        return e.json(403, { error: "Access denied. Only administrators can revert rankings." });
    }

    let category = "5_juz";
    try {
        const body = new DynamicModel({
            category: "5_juz"
        });
        e.bindBody(body);
        category = (body.category || "5_juz").trim();
    } catch (_) {}

    try {
        const filterString = "category = {:category} && is_finalist = true";
        const finalists = $app.findRecordsByFilter(
            "participants_application",
            filterString,
            "allocated_order",
            100,
            0,
            { category: category }
        );

        $app.runInTransaction((txApp) => {
            finalists.forEach(student => {
                student.set("final_ranking", 0);
                txApp.save(student);
            });
        });

        return e.json(200, { success: true, message: "Successfully reverted rankings." });
    } catch (err) {
        return e.json(500, { error: "Failed to revert rankings: " + err });
    }
});
