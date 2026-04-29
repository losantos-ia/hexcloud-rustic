const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");

const credPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
const token = creds.tokens.access_token;

const bucket = "ra-staging-ea1ba.firebasestorage.app";
const corsConfig = JSON.stringify({
  cors: [
    {
      origin: [
        "https://ra-staging.hexcloud.es",
        "https://hexcloud.es",
        "http://localhost:3000",
        "http://localhost:3001",
      ],
      method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
      responseHeader: ["Content-Type", "Authorization", "x-goog-resumable"],
      maxAgeSeconds: 3600,
    },
  ],
});

const options = {
  hostname: "storage.googleapis.com",
  path: `/storage/v1/b/${encodeURIComponent(bucket)}?fields=cors`,
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(corsConfig),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("\n✓ CORS configured successfully on", bucket);
    } else {
      console.error("\n✗ Failed to set CORS");
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});

req.write(corsConfig);
req.end();
