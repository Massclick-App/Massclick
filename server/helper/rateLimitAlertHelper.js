import crypto from "node:crypto";
import net from "node:net";
import os from "node:os";
import tls from "node:tls";
import { once } from "node:events";

import { createLogger } from "../utils/logger.js";
import { getRedisClient, isRedisConnected } from "../utils/redisClient.js";

const logger = createLogger("RateLimitAlert");

const localAlertLocks = new Map();
const ALERT_LOCK_TTL_MS = 60 * 60 * 1000;

const getConfiguredHost = () =>
  process.env.RATE_LIMIT_ALERT_SMTP_HOST ||
  process.env.SMTP_HOST ||
  "";

const getConfiguredPort = () => {
  const explicitPort = process.env.RATE_LIMIT_ALERT_SMTP_PORT || process.env.SMTP_PORT;
  if (explicitPort) {
    const parsed = Number(explicitPort);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const hostValue = getConfiguredHost();
  const parsedFromHost = hostValue.match(/:(\d+)$/);
  if (parsedFromHost) {
    return Number(parsedFromHost[1]);
  }

  return 587;
};

const getConfiguredSmtpHost = () => getConfiguredHost().replace(/:(\d+)$/, "");

const getSmtpUser = () =>
  process.env.RATE_LIMIT_ALERT_SMTP_USER ||
  process.env.SMTP_USER ||
  "";

const getSmtpPassword = () =>
  process.env.RATE_LIMIT_ALERT_SMTP_PASSWORD ||
  process.env.SMTP_PASSWORD ||
  "";

const getAlertFromAddress = () =>
  process.env.RATE_LIMIT_ALERT_SMTP_FROM ||
  process.env.RATE_LIMIT_ALERT_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  getSmtpUser() ||
  "";

const getAlertFromName = () =>
  process.env.RATE_LIMIT_ALERT_SMTP_FROM_NAME ||
  process.env.RATE_LIMIT_ALERT_FROM_NAME ||
  "Massclick Alerts";

const getAlertRecipients = () => {
  const configured = (process.env.RATE_LIMIT_ALERT_TO_EMAILS || process.env.RATE_LIMIT_ALERT_TO_EMAIL || "")
    .split(/[,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  const fallback = getAlertFromAddress() || getSmtpUser();
  return fallback ? [fallback] : [];
};

const cleanupLocalLocks = (now) => {
  for (const [key, expiresAt] of localAlertLocks.entries()) {
    if (expiresAt <= now) {
      localAlertLocks.delete(key);
    }
  }
};

const claimAlertLock = async (lockKey, ttlMs = ALERT_LOCK_TTL_MS) => {
  const now = Date.now();
  cleanupLocalLocks(now);

  if (isRedisConnected()) {
    try {
      const redisClient = getRedisClient();
      const result = await redisClient.set(lockKey, "1", {
        NX: true,
        EX: Math.max(1, Math.ceil(ttlMs / 1000)),
      });
      return result === "OK";
    } catch (error) {
      await logger.warn("Redis alert lock failed, falling back to memory lock", {
        error: error.message,
        lockKey,
      });
    }
  }

  if (localAlertLocks.has(lockKey)) {
    return false;
  }

  localAlertLocks.set(lockKey, now + ttlMs);
  return true;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

const buildEmailBody = ({
  ruleName,
  message,
  limit,
  windowMs,
  count,
  clientIp,
  method,
  path,
  retryAfterSeconds,
  resetAt,
  bucketKey,
}) => {
  const windowMinutes = Math.max(1, Math.round(windowMs / 60000));
  const lines = [
    `Rate limit was exceeded for ${ruleName}.`,
    "",
    `Message: ${message}`,
    `Limit: ${limit}`,
    `Current count: ${count}`,
    `Window: ${windowMinutes} minute(s)`,
    `Retry after: ${retryAfterSeconds} second(s)`,
    `Reset at: ${new Date(resetAt).toISOString()}`,
    `Client IP: ${clientIp || "unknown"}`,
    `Method: ${method || "unknown"}`,
    `Path: ${path || "unknown"}`,
    `Bucket key: ${bucketKey || "unknown"}`,
  ];

  return lines.join("\n");
};

const buildMimeMessage = ({ fromAddress, fromName, recipients, subject, textBody, htmlBody }) => {
  const boundary = `rate-limit-${crypto.randomBytes(8).toString("hex")}`;
  const headers = [
    `From: ${fromName} <${fromAddress}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return headers.replace(/(^|\r\n)\./g, "$1..");
};

const createSmtpConnection = async ({ host, port }) => {
  const socket = net.connect({ host, port });
  socket.setTimeout(15000);

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.removeListener("connect", onConnect);
      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);
    };

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      socket.destroy(new Error("SMTP connection timed out"));
      reject(new Error("SMTP connection timed out"));
    };

    socket.once("connect", onConnect);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
};

const readSmtpResponse = async (socket) => {
  let buffer = "";
  const lines = [];

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      socket.off("timeout", onTimeout);
    };

    const finish = (code) => {
      cleanup();
      resolve({ code, lines });
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly"));
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP response timed out"));
    };

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");

      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) {
          break;
        }

        const rawLine = buffer.slice(0, newlineIndex + 1);
        buffer = buffer.slice(newlineIndex + 1);
        const line = rawLine.trimEnd();
        if (!line) {
          continue;
        }

        lines.push(line);
        if (/^\d{3} /.test(line)) {
          finish(Number(line.slice(0, 3)));
          return;
        }
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
    socket.once("timeout", onTimeout);
  });
};

const sendSmtpCommand = async (socket, command, expectedCodes) => {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);

  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed (${command.split(" ")[0]}): ${response.lines.join(" | ")}`);
  }

  return response;
};

const sendRateLimitEmail = async ({ fromAddress, fromName, recipients, subject, textBody, htmlBody }) => {
  const host = getConfiguredSmtpHost();
  const port = getConfiguredPort();
  const user = getSmtpUser();
  const password = getSmtpPassword().replace(/\s+/g, "");

  if (!host || !port || !user || !password || !fromAddress || !recipients.length) {
    console.warn("[RateLimitAlert] SMTP alert skipped: missing host, port, credentials, sender, or recipients");
    return false;
  }

  const socket = await createSmtpConnection({ host, port });

  try {
    const localHostname = process.env.SMTP_CLIENT_HOSTNAME || os.hostname() || "localhost";

    await readSmtpResponse(socket);
    await sendSmtpCommand(socket, `EHLO ${localHostname}`, [250]);
    await sendSmtpCommand(socket, "STARTTLS", [220]);

    const secureSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized: true,
    });

    await once(secureSocket, "secureConnect");
    secureSocket.setTimeout(15000);

    await sendSmtpCommand(secureSocket, `EHLO ${localHostname}`, [250]);
    await sendSmtpCommand(secureSocket, "AUTH LOGIN", [334]);
    await sendSmtpCommand(secureSocket, Buffer.from(user, "utf8").toString("base64"), [334]);
    await sendSmtpCommand(secureSocket, Buffer.from(password, "utf8").toString("base64"), [235]);
    await sendSmtpCommand(secureSocket, `MAIL FROM:<${fromAddress}>`, [250]);

    for (const recipient of recipients) {
      await sendSmtpCommand(secureSocket, `RCPT TO:<${recipient}>`, [250, 251]);
    }

    await sendSmtpCommand(secureSocket, "DATA", [354]);

    const rawMessage = buildMimeMessage({
      fromAddress,
      fromName,
      recipients,
      subject,
      textBody,
      htmlBody,
    });

    secureSocket.write(`${rawMessage}\r\n.\r\n`);
    const dataResponse = await readSmtpResponse(secureSocket);
    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.lines.join(" | ")}`);
    }

    try {
      await sendSmtpCommand(secureSocket, "QUIT", [221]);
    } catch (quitError) {
      await logger.warn("SMTP QUIT failed after successful send", { error: quitError.message });
    }

    return true;
  } finally {
    socket.destroy();
  }
};

export const sendRateLimitAlert = async ({
  ruleName,
  message,
  limit,
  windowMs,
  count,
  clientIp,
  method,
  path,
  retryAfterSeconds,
  resetAt,
  bucketKey,
}) => {
  const recipients = getAlertRecipients();
  const fromAddress = getAlertFromAddress();
  const fromName = getAlertFromName();

  if (!recipients.length || !fromAddress || process.env.RATE_LIMIT_ALERTS_ENABLED === "false") {
    return false;
  }

  const lockKey = `rate-limit-alert:${ruleName}:${bucketKey || clientIp || "unknown"}`;
  const lockClaimed = await claimAlertLock(lockKey, windowMs);
  if (!lockClaimed) {
    return false;
  }

  const subject = `[Massclick] Rate limit triggered: ${ruleName}`;
  const textBody = buildEmailBody({
    ruleName,
    message,
    limit,
    windowMs,
    count,
    clientIp,
    method,
    path,
    retryAfterSeconds,
    resetAt,
    bucketKey,
  });
  const htmlBody = `<div style="font-family:Arial,sans-serif;line-height:1.5">${textBody
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("")}</div>`;

  try {
    const sent = await sendRateLimitEmail({
      fromAddress,
      fromName,
      recipients,
      subject,
      textBody,
      htmlBody,
    });

    if (sent) {
      await logger.info("Rate limit alert email sent", {
        ruleName,
        recipients,
        clientIp,
        path,
      });
      return true;
    }

    await logger.warn("Rate limit alert email skipped due to missing SMTP configuration", {
      ruleName,
      recipients,
      clientIp,
      path,
    });
    return false;
  } catch (error) {
    console.warn("[RateLimitAlert] SMTP send failed:", error.message);
    await logger.warn("Failed to send rate limit alert email", {
      error: error.message,
      ruleName,
      recipients,
      clientIp,
      path,
    });
    return false;
  }
};
