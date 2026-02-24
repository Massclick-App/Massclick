import prerender from "prerender";

const server = prerender({
  port: 3001,
  chromeLocation: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--remote-debugging-port=9222"
  ]
});

server.start();

console.log("Prerender service running on port 3001");