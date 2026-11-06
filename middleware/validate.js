/**
 * validate({ body, query, params }) parses each part with its zod schema.
 * Parsed (trimmed / coerced / defaulted) values land on `req.valid.*`;
 * `req.body` is replaced too. Express 5 makes `req.query` read-only, so
 * always read query input from `req.valid.query`.
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].parse(req[part] ?? {});
    req.valid[part] = result;
    if (part === 'body') req.body = result;
  }
  next();
};
