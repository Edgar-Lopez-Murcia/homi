import xss from 'xss';

const opcionesXss = {
    whiteList: {},                          // no permite ninguna etiqueta HTML
    stripIgnoreTag: true,                   // elimina las etiquetas en vez de escaparlas
    stripIgnoreTagBody: ['script', 'style']
};

const CAMPOS_EXCLUIDOS = new Set(['contrasena', 'password', 'token']);
const LLAVES_PELIGROSAS = new Set(['__proto__', 'constructor', 'prototype']);

const esObjetoPlano = (v) => {
    if (v === null || typeof v !== 'object') return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
};

const limpiar = (valor, llave = '') => {
    if (typeof valor === 'string') {
        return CAMPOS_EXCLUIDOS.has(llave) ? valor : xss(valor, opcionesXss).trim();
    }
    if (Array.isArray(valor)) return valor.map((v) => limpiar(v, llave));
    if (esObjetoPlano(valor)) {
        const resultado = {};
        for (const k of Object.keys(valor)) {
            if (LLAVES_PELIGROSAS.has(k)) continue;
            resultado[k] = limpiar(valor[k], k);
        }
        return resultado;
    }
    return valor;
};

const sanitizarEntradas = (req, res, next) => {
    if (req.body) req.body = limpiar(req.body);

    // Funciona en Express 4 y 5 (en el 5, req.query no se puede mutar directamente)
    if (req.query) {
        Object.defineProperty(req, 'query', {
            value: limpiar(req.query),
            writable: true,
            configurable: true,
            enumerable: true
        });
    }
    next();
};

export default sanitizarEntradas;
