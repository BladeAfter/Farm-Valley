import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;
if (serverUrl && !/^https?:\/\//.test(serverUrl)) throw new Error("CAPACITOR_SERVER_URL deve ser HTTP ou HTTPS.");
const config: CapacitorConfig = {
  appId: "com.farmvalley.app",
  appName: "Farm Valley",
  webDir: "dist",
  backgroundColor: "#79a94d",
  ...(serverUrl ? { server: { url: serverUrl, cleartext: serverUrl.startsWith("http:") } } : {}),
};
export default config;
