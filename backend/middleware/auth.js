const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "change_this_secret";

exports.authenticate = (req, res, next) => {
  const header =
    req.headers.authorization ||
    req.query.token ||
    req.headers["x-access-token"];
  if (!header)
    return res.status(401).json({ error: "Authorization header missing" });
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;
  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id || payload._id, isAdmin: !!payload.isAdmin };
    next();
  } catch (err) {
    console.error("Token verify failed", err && err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

exports.adminOnly = (req, res, next) => {
  exports.authenticate(req, res, () => {
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ error: "Forbidden: admin only" });
    next();
  });
};
