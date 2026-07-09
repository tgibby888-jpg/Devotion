#!/usr/bin/env node
const http = require("http");
http.get("http://localhost:3000", (res) => {
  let data = "";
  res.on("data", (c) => (data += c));
  res.on("end", () => {
    const fs = require("fs");
    fs.writeFileSync(
      "/tmp/sitecheck2.txt",
      JSON.stringify({
        status: res.statusCode,
        hasWaitlist: data.includes("Join waitlist"),
        hasComingSoon: data.includes("Coming soon"),
        hasEarlyAccess: data.includes("Early Access"),
        length: data.length,
        title: data.match(/<title>([^<]+)/)?.[1] || "none",
      })
    );
  });
}).on("error", (e) => {
  require("fs").writeFileSync("/tmp/sitecheck2.txt", JSON.stringify({ error: e.message }));
});