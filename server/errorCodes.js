// errorCodes.js

export const OK = { code: 200, message: "OK" };
export const BAD_REQUEST = { code: 400, message: "Bad Request" };
export const UNAUTHORIZED = { code: 401, message: "Unauthorized" };
export const FORBIDDEN = { code: 403, message: "Forbidden" };
export const NOT_FOUND = { code: 404, message: "Not Found" };
export const CONFLICT = { code: 409, message: "Conflict" };
export const INTERNAL_SERVER_ERROR = { code: 500, message: "Internal Server Error" };
export const BAD_GATEWAY = { code: 502, message: "Bad Gateway" };
export const SERVICE_UNAVAILABLE = { code: 503, message: "Service Unavailable" };

export const ERROR_CODES = {
    OK,
    BAD_REQUEST,
    UNAUTHORIZED,
    FORBIDDEN,
    NOT_FOUND,
    CONFLICT,
    INTERNAL_SERVER_ERROR,
    BAD_GATEWAY,
    SERVICE_UNAVAILABLE,
};
