// Devotion Twitter Auto-Poster Setup
// Run: node setup.js
// This installs dependencies and sets up cron jobs

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BOT_DIR = __dirname;

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    const output = execSync(cmd, { cwd: BOT_DIR, shell: "/bin/bash" });
    console.log(output.toString());
    return output.toString();
  } catch (err) {
    console.error(err.stderr?.toString() || err.message);
    return null;
  }
}

console.log("=== Devotion Twitter Auto-Poster Setup ===\n");

// 1. Make scripts executable
run("chmod +x auto_post.sh setup_env.sh");

// 2. Install npm dependency
console.log("\n--- Installing twitter-api-v2 ---");
if (!fs.existsSync(path.join(BOT_DIR, "node_modules", "twitter-api-v2"))) {
  run("npm init -y");
  run("npm install twitter-api-v2");
} else {
  console.log("Already installed.");
}

// 3. Set up cron
console.log("\n--- Setting up cron jobs ---");
const cronJobs = [
  "0 14 * * * " + BOT_DIR + "/auto_post.sh # 10am EST",
  "0 23 * * * " + BOT_DIR + "/auto_post.sh # 7pm EST",
];

const existingCron = execSync("crontab -l 2>/dev/null || true").toString();
const filtered = existingCron
  .split("\n")
  .filter((line) => !line.includes("auto_post.sh"))
  .join("\n");
const newCron = filtered + "\n" + cronJobs.join("\n") + "\n";
fs.writeFileSync("/tmp/devotion_cron", newCron);
run("crontab /tmp/devotion_cron");

console.log("\n--- Current crontab ---");
run("crontab -l");

console.log("\n=== Setup complete! ===");
console.log("Twitter auto-poster will post 2 tweets/day at 10am and 7pm EST.");