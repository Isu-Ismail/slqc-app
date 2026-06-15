// pocketbase/pb_hooks/admin_api_metadata.pb.js

routerAdd("POST", "/api/admin/update-metadata", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    const info = e.requestInfo();
    const headers = info.headers || {};

    let contentType = "";
    const ctHeader = headers["content_type"] || headers["content-type"] || headers["Content-Type"] || headers["Content_Type"];
    if (ctHeader) {
        if (typeof ctHeader === "string") {
            contentType = ctHeader;
        } else if (Array.isArray(ctHeader) && ctHeader.length > 0) {
            contentType = ctHeader[0];
        } else if (typeof ctHeader.length === "number" && ctHeader.length > 0) {
            contentType = ctHeader[0];
        } else {
            contentType = String(ctHeader);
        }
    }
    contentType = contentType.toLowerCase();

    let key = "";
    let value = "";
    let clearDocument = false;

    if (contentType.indexOf("application/json") !== -1) {
        const body = new DynamicModel({
            key: "",
            value: "",
            clear_document: ""
        });
        e.bindBody(body);
        key = body.key;
        value = body.value;
        clearDocument = (body.clear_document === "true" || body.clear_document === true);
    } else {
        const data = info.data || {};
        key = data.key || "";
        if (!key) {
            if (typeof e.FormValue === "function") {
                key = e.FormValue("key") || "";
            } else if (typeof e.formValue === "function") {
                key = e.formValue("key") || "";
            } else if (e.request && typeof e.request.FormValue === "function") {
                key = e.request.FormValue("key") || "";
            } else if (e.request && typeof e.request.formValue === "function") {
                key = e.request.formValue("key") || "";
            }
        }

        value = data.value || "";
        if (!value) {
            if (typeof e.FormValue === "function") {
                value = e.FormValue("value") || "";
            } else if (typeof e.formValue === "function") {
                value = e.formValue("value") || "";
            } else if (e.request && typeof e.request.FormValue === "function") {
                value = e.request.FormValue("value") || "";
            } else if (e.request && typeof e.request.formValue === "function") {
                value = e.request.formValue("value") || "";
            }
        }

        let clearDocStr = data.clear_document || "";
        if (!clearDocStr) {
            if (typeof e.FormValue === "function") {
                clearDocStr = e.FormValue("clear_document") || "";
            } else if (typeof e.formValue === "function") {
                clearDocStr = e.formValue("clear_document") || "";
            } else if (e.request && typeof e.request.FormValue === "function") {
                clearDocStr = e.request.FormValue("clear_document") || "";
            } else if (e.request && typeof e.request.formValue === "function") {
                clearDocStr = e.request.formValue("clear_document") || "";
            }
        }
        clearDocument = (clearDocStr === "true" || clearDocStr === true);
    }

    if (!key) {
        return e.json(400, { error: "Missing metadata key parameter" });
    }

    try {
        let record;
        try {
            record = $app.findFirstRecordByData("metadata", "key", key);
        } catch (_) {
            const collection = $app.findCollectionByNameOrId("metadata");
            record = new Record(collection);
            record.set("key", key);
        }

        let hasNewDocument = false;
        if (contentType.indexOf("multipart/form-data") !== -1) {
            const docFiles = e.findUploadedFiles("document");
            if (docFiles && docFiles.length > 0) {
                record.set("document", docFiles[0]);
                hasNewDocument = true;
                if (key.indexOf("_rules") !== -1 || key === "dos_and_donts" || key === "venue_map" || key.indexOf("template") !== -1) {
                    record.set("value", "");
                }
            }
        }

        if (!hasNewDocument) {
            record.set("value", value);
            if (clearDocument) {
                record.set("document", null);
            }
        }

        $app.save(record);

        return e.json(200, {
            id: record.get("id"),
            key: record.get("key"),
            value: record.get("value"),
            document: record.get("document"),
            created: record.get("created"),
            updated: record.get("updated")
        });

    } catch (err) {
        return e.json(500, { error: "Failed to update metadata: " + err });
    }
});

routerAdd("POST", "/api/admin/calculate-stats", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        const institutions = $app.findRecordsByFilter("institutions", "id != ''", "", 99999, 0);
        const totalInstitutions = institutions.length;

        const applications = $app.findRecordsByFilter("participants_application", "id != ''", "", 99999, 0);
        const totalApplications = applications.length;

        const statusCounts = {
            pending: 0,
            approved: 0,
            rejected: 0,
            reapplied: 0
        };

        const categoryStats = {
            "5_juz": {
                total_accepted: 0,
                options: {}
            },
            "15_juz": {
                total_accepted: 0,
                options: {}
            },
            "30_juz": {
                total_accepted: 0,
                options: {}
            }
        };

        let totalAccommodationStudents = 0;
        let approvedAccommodationStudents = 0;

        for (let i = 0; i < applications.length; i++) {
            const appRec = applications[i];
            const status = appRec.get("status") || "pending";
            const cat = appRec.get("category");
            const juzzOpt = appRec.get("juzz_options") || "none";
            const reqAcc = appRec.get("requires_accommodation") === true;

            if (statusCounts[status] !== undefined) {
                statusCounts[status]++;
            } else {
                statusCounts[status] = 1;
            }

            if (reqAcc) {
                totalAccommodationStudents++;
                if (status === "approved") {
                    approvedAccommodationStudents++;
                }
            }

            if (status === "approved") {
                if (categoryStats[cat]) {
                    categoryStats[cat].total_accepted++;
                    const optKey = juzzOpt || "none";
                    if (!categoryStats[cat].options[optKey]) {
                        categoryStats[cat].options[optKey] = 0;
                    }
                    categoryStats[cat].options[optKey]++;
                }
            }
        }

        const statsObj = {
            total_institutions: totalInstitutions,
            total_applications: totalApplications,
            status_counts: statusCounts,
            category_stats: categoryStats,
            accommodation_stats: {
                total_students_needing_accommodation: totalAccommodationStudents,
                accepted_students_needing_accommodation: approvedAccommodationStudents,
                institutions_count_incharge: totalInstitutions,
                grand_total_accommodation: approvedAccommodationStudents + totalInstitutions
            },
            last_updated: new Date().toISOString()
        };

        let record;
        try {
            record = $app.findFirstRecordByData("metadata", "key", "stat");
        } catch (_) {
            const collection = $app.findCollectionByNameOrId("metadata");
            record = new Record(collection);
            record.set("key", "stat");
        }

        record.set("value", JSON.stringify(statsObj));
        $app.save(record);

        return e.json(200, statsObj);
    } catch (err) {
        return e.json(500, { error: "Failed to calculate statistics: " + err });
    }
});
