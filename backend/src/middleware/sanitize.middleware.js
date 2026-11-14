const sanitizeText = (value) => {
  if (typeof value === 'string') {
    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeText);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key.toLowerCase() === 'password' ? child : sanitizeText(child),
      ])
    );
  }
  return value;
};

const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeText(req.body);
  }
  next();
};

module.exports = sanitizeRequestBody;
