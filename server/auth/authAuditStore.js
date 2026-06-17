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

  return event;
};

export const listAuthAuditEvents = ({
  limit = 100,
  eventType,
  actorType,
  source,
} = {}) => {
  return auditEvents
    .filter((event) => !eventType || event.eventType === eventType)
    .filter((event) => !actorType || event.actor.actorType === actorType)
    .filter((event) => !source || event.source === source)
    .slice(0, Math.max(1, Math.min(Number(limit) || 100, MAX_AUDIT_EVENTS)));
};

export const summarizeAuthAuditEvents = () => {
  return auditEvents.reduce((accumulator, event) => {
    accumulator[event.eventType] = (accumulator[event.eventType] || 0) + 1;
    return accumulator;
  }, {});
};
