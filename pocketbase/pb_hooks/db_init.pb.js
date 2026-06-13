// pocketbase/pb_hooks/db_init.pb.js
//
// Automated and manual database initialization, schema verification,
// rules update, and rate limit rules configuration.

function initDb(app) {
    console.log("[db_init] Starting database initialization...");
    try {
        const schemaPath = "/pb_hooks/schema.json";
        const schemaBytes = $os.readFile(schemaPath);
        const schemaJson = String.fromCharCode.apply(null, schemaBytes);

        // 1. Import Collections (non-destructively: deleteMissing = false)
        app.importCollectionsByMarshaledJSON(schemaJson, false);
        console.log("[db_init] Successfully verified/updated collection schemas and rules.");

        // 2. Configure Rate Limiting Rules
        const settings = app.settings();
        settings.rateLimits.enabled = true;
        
        const desiredRules = [
            { label: "*:auth", maxRequests: 2, duration: 3, audience: "" },
            { label: "*:create", maxRequests: 20, duration: 5, audience: "" },
            { label: "/api/batch", maxRequests: 3, duration: 1, audience: "" },
            { label: "/api/", maxRequests: 300, duration: 10, audience: "" },
            { label: "/api/public/verify-institution", maxRequests: 5, duration: 60, audience: "" },
            { label: "/api/public/submit-application", maxRequests: 3, duration: 60, audience: "" },
            { label: "/api/public/track-individual", maxRequests: 10, duration: 30, audience: "" }
        ];

        try {
            settings.rateLimits.rules = desiredRules;
            // Both saveSettings and save are supported on coreapp
            if (typeof app.saveSettings === "function") {
                app.saveSettings(settings);
            } else {
                app.save(settings);
            }
            console.log("[db_init] Successfully configured rate limit rules.");
        } catch (settingsErr) {
            console.error("[db_init] Failed to save rate limit settings: " + settingsErr);
        }

    } catch (err) {
        console.error("[db_init] Database initialization error: " + err);
        throw err;
    }
}

// ── 1. RUN AUTOMATICALLY ON BOOTSTRAP ────────────────────────────────────────
$app.onServe().bindFunc((e) => {
    try {
        initDb($app);
    } catch (err) {
        console.error("[db_init] Bootstrap auto-init failed: " + err);
    }
    return e.next();
});

// ── 2. RUN MANUALLY VIA ADMIN ENDPOINT ───────────────────────────────────────
routerAdd("POST", "/api/admin/init-db", (e) => {
    const authRecord = e.auth;
    const isSuperuser = authRecord && authRecord.collection().name === "_superusers";
    const isAdmin = authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin";

    if (!isSuperuser && !isAdmin) {
        return e.json(403, { error: "Unauthorized. Admin access required." });
    }

    try {
        initDb($app);
        return e.json(200, { success: true, message: "Database schema, rules, and rate limits initialized successfully." });
    } catch (err) {
        return e.json(500, { error: "Manual database initialization failed: " + err });
    }
});
