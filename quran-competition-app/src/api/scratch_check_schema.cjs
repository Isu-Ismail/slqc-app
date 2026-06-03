const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/ismail/WEB_dev/quran_competition/pocketbase/pb_data/data.db');

db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='participants_application';", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
