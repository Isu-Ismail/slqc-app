// pocketbase/pb_hooks/mail_queue.pb.js
// Cron job to process mail queue

cronAdd("process_mail_queue", "*/3 * * * *", () => {
    try {
        const result = $app.findRecordsByFilter(
            "mail_queue",
            "status = 'pending'",
            "created", // sort by created ascending
            1, // limit 1
            0  // offset 0
        );

        if (result && result.length > 0) {
            const mailRecord = result[0];
            const toEmail = mailRecord.get("to_email");
            const toName = mailRecord.get("to_name");
            const subject = mailRecord.get("subject");
            const bodyHtml = mailRecord.get("body_html");
            let attempts = mailRecord.getInt("attempts") || 0;

            attempts++;

            try {
                const message = new MailerMessage({
                    from: {
                        address: $app.settings().meta.senderAddress || "noreply@example.com",
                        name: $app.settings().meta.senderName || "SLQC 2026"
                    },
                    to: [{ address: toEmail, name: toName }],
                    subject: subject,
                    html: bodyHtml
                });

                $app.newMailClient().send(message);

                mailRecord.set("status", "sent");
                mailRecord.set("sent_at", new Date().toISOString());
                mailRecord.set("attempts", attempts);
                $app.save(mailRecord);
                
                console.log(`Successfully sent email to ${toEmail}`);
            } catch (err) {
                console.error(`Failed to send email to ${toEmail}: ${err}`);
                
                mailRecord.set("attempts", attempts);
                mailRecord.set("last_error", err.toString());
                
                if (attempts >= 3) {
                    mailRecord.set("status", "failed");
                }
                
                $app.save(mailRecord);
            }
        }
    } catch (err) {
        console.error("Mail queue cron error: ", err);
    }
});
