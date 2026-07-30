import authAuditModel from "../model/authAuditModel.js";

const MAX_AUDIT_EVENTS = 500;
const auditEvents = [];

const toActorSummary = (actor) => ({
  actorType: actor?.actorType || null,
  sessionType: actor?.sessionType || null,
  subjectId: actor?.subjectId || null,
  role: actor?.role || null,
  mobile: actor?.mobile || null,
  deviceId: actor?.deviceId || null,
  clientId: actor?.clientId || null,
  tokenId: actor?.tokenId || null,
});

const getLimit = (limit = 100) =>
  Math.max(1, Math.min(Number(limit) || 100, MAX_AUDIT_EVENTS));

const filterMemoryEvents = ({ limit = 100, eventType, actorType, source } = {}) =>
  auditEvents
    .filter((event) => !eventType || event.eventType === eventType)
    .filter((event) => !actorType || event.actor.actorType === actorType)
    .filter((event) => !source || event.source === source)
    .slice(0, getLimit(limit));

const mapAuditDoc = (doc) => ({
  id: doc.eventId || String(doc._id),
  createdAt: doc.createdAt instanceof Date
    ? doc.createdAt.toISOString()
    : doc.createdAt,
  eventType: doc.eventType,
  source: doc.source,
  statusCode: doc.statusCode,
  message: doc.message,
  path: doc.path,
  method: doc.method,
  ip: doc.ip,
  actor: doc.actor || toActorSummary(null),
  metadata: doc.metadata || {},
});

export const logAuthAuditEvent = ({
  eventType,
  actor = null,
  source = "http",
  req = null,
  socket = null,
  statusCode = null,
  message = "",
  metadata = {},
}) => {
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    eventType,
    source,
    statusCode,
    message,
    path: req?.originalUrl || socket?.handshake?.url || null,
    method: req?.method || (socket ? "WS" : null),
    ip:
      req?.ip ||
      socket?.handshake?.address ||
      req?.headers?.["x-forwarded-for"] ||
      null,
    actor: toActorSummary(actor),
    metadata,
  };

  auditEvents.unshift(event);
  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.length = MAX_AUDIT_EVENTS;
  }

  authAuditModel
    .create({
      ...event,
      eventId: event.id,
      createdAt: new Date(event.createdAt),
    })
    .catch(() => {});

  return event;
};

export const listAuthAuditEvents = async ({
  limit = 100,
  eventType,
  actorType,
  source,
} = {}) => {
  const query = {};
  if (eventType) query.eventType = eventType;
  if (actorType) query["actor.actorType"] = actorType;
  if (source) query.source = source;

  try {
    const events = await authAuditModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(getLimit(limit))
      .lean();

    return events.map(mapAuditDoc);
  } catch {
    return filterMemoryEvents({ limit, eventType, actorType, source });
  }
};

export const summarizeAuthAuditEvents = async () => {
  try {
    const rows = await authAuditModel.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
    ]);

    return rows.reduce((accumulator, row) => {
      accumulator[row._id] = row.count;
      return accumulator;
    }, {});
  } catch {
    return auditEvents.reduce((accumulator, event) => {
      accumulator[event.eventType] = (accumulator[event.eventType] || 0) + 1;
      return accumulator;
    }, {});
  }
};
