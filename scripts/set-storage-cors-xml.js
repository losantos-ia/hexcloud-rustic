const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

const creds = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".config", "configstore", "firebase-tools.json"), "utf8")
);
const token = creds.tokens.access_token;

const buckets = [
  { name: "ra-staging-ea1ba.appspot.com", api: "xml" },
  { name: "ra-staging-ea1ba.firebasestorage.app", api: "xml" },
];

const origins = [
  "https://ra-staging.hexcloud.es",
  "https://hexcloud.es",
  "http://localhost:3000",
  "http://localhost:3001",
];

const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CorsConfig>
  <Cors>
    <Origins>${origins.map((o) => `<Origin>${o}</Origin>`).join("")}</Origins>
    <Methods><Method>GET</Method><Method>POST</Method><Method>PUT</Method><Method>DELETE</Method><Method>HEAD</Method></Methods>
    <ResponseHeaders><ResponseHeader>Content-Type</ResponseHeader><ResponseHeader>Authorization</ResponseHeader><ResponseHeader>x-goog-resumable</ResponseHeader></ResponseHeaders>
    <MaxAgeSec>3600</MaxAgeSec>
  </Cors>
</CorsConfig>`;

function setCorsXml(bucket) {
  return new Promise((resolve) => {
    const opts = {
      hostname: "storage.googleapis.com",
      path: "/" + bucket + "?cors",
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/xml",
        "Content-Length": Buffer.byteLength(corsXml),
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        console.log(bucket + " XML -> " + res.statusCode + ": " + d.substring(0, 150));
        resolve();
      });
    });
    req.on("error", (e) => {
      console.log(bucket + " error: " + e.message);
      resolve();
    });
    req.write(corsXml);
    req.end();
  });
}

(async () => {
  for (const b of buckets) await setCorsXml(b.name);
})();
