import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
} from "./metrics.js";

export function metricsMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationSec = Number(durationNs) / 1e9;

    const route = req.route?.path ?? req.path ?? "unknown";
    const labels = {
      method: req.method,
      route,
      status: res.statusCode,
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSec);
  });

  next();
}
