// Usage: node make-user.js <username> <password> ["Display Name"]
// Prints a JSON line you paste into users.json
const crypto = require("crypto");
const [u, p, name] = process.argv.slice(2);
if (!u || !p) { console.log('Usage: node make-user.js <username> <password> ["Display Name"]'); process.exit(1); }
const hash = crypto.createHash("sha256").update(u.toLowerCase() + ":" + p).digest("hex");
console.log(JSON.stringify({ username: u.toLowerCase(), name: name || u, hash }, null, 2) + ",");