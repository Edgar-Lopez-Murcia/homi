// middleware/sanitizarEntradas.js

const sanitizarEntradas = (req, res, next) => {
    if (req.body) {
        for (let llave in req.body) {
            if (typeof req.body[llave] === 'string') {
                // Reemplaza las etiquetas de código para que el navegador las lea como texto inofensivo
                req.body[llave] = req.body[llave].replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
            }
        }
    }
    next();
};

module.exports = sanitizarEntradas;
