const xss = require('xss');

const sanitizarEntradas = (req, res, next) => {
    // Sanitizar body
    if (req.body) {
        for (let llave in req.body) {
            if (typeof req.body[llave] === 'string') {
                req.body[llave] = xss(req.body[llave]).trim();
            }
        }
    }
    // Sanitizar query params
    if (req.query) {
        for (let llave in req.query) {
            if (typeof req.query[llave] === 'string') {
                req.query[llave] = xss(req.query[llave]).trim();
            }
        }
    }
    // Sanitizar route params
    if (req.params) {
        for (let llave in req.params) {
            if (typeof req.params[llave] === 'string') {
                req.params[llave] = xss(req.params[llave]).trim();
            }
        }
    }
    next();
};

module.exports = sanitizarEntradas;
