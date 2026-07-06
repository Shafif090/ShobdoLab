export function notFound(req, res) {
  return res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      details: null,
    },
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  const code = status === 413 ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR";
  const message =
    status === 413
      ? "Request body is too large."
      : "Something went wrong while handling this request.";

  console.error("[request:error]", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    message: error.message,
  });

  return res.status(status).json({
    error: {
      code,
      message,
      details: null,
    },
  });
}
