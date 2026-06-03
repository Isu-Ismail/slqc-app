// pocketbase/pb_hooks/users.pb.js

// Allow admins to set the 'verified' status during user creation
onRecordCreate((e) => {
    try {
        const authRecord = e.auth;
        // Ensure the requester is logged in and is an admin
        if (authRecord && authRecord.collection().name === "users" && authRecord.get("designation") === "admin") {
            const verifyHeader = e.httpContext.request().header.get("x-set-verified");

            if (verifyHeader === "true") {
                e.record.setVerified(true);
            } else if (verifyHeader === "false") {
                e.record.setVerified(false);
            }
        }
    } catch (err) {
        console.error("users before create hook error: " + err);
    }
    return e.next();
}, "users");
