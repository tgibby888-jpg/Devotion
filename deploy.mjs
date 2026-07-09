// Try to run build via child_process
import { execSync } from "child_process";
try {
  const result = execSync("cd /home/team/shared/site && bun run build 2>&1", {
    timeout: 30000,
    encoding: "utf-8",
  });
  process.stdout.write(result);
} catch (e) {
  process.stderr.write("Error: " + e.message + "\n" + (e.stdout || "") + "\n" + (e.stderr || ""));
}

// Try to start server
const http = require("http");
http.get("http://localhost:3000", (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    const fs = require("fs");
    fs.writeFileSync(
      "/tmp/publish_result.txt",
      JSON.stringify({
        status: res.statusCode,
        hasWaitlist: data.includes("Join waitlist"),
        hasQuestionnaire: data.includes("begin the questionnaire"),
        title: (data.match(/<title>([^<]+)/) || [])[1] || "none",
      })
    );
    process.stdout.write("Site check complete\n");
  });
}).on("error", (e) => {
  require("fs").writeFileSync("/tmp/publish_result.txt", JSON.stringify({ error: e.message }));
  process.stderr.write("Error: " + e.message + "\n");
});