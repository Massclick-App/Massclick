import admin from "firebase-admin";
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);

const loadServiceAccount = () => {
  const credentialPaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    "/home/admin/credentials/massclick-dc8f6-4ac3adcfe0be.json",
  ].filter(Boolean);

  for (const credentialPath of credentialPaths) {
    if (fs.existsSync(credentialPath)) {
      return JSON.parse(fs.readFileSync(credentialPath, "utf8"));
    }
  }

  return require("../key.json");
};

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "massclick-dc8f6",
  });
}

export default admin;
