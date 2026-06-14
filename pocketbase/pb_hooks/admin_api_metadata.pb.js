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
                if (key.indexOf("_rules") !== -1 || key === "dos_and_donts" || key === "venue_map") {
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
