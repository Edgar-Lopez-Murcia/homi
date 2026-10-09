# 🗺️ Mapa de Ruta: Implementación de Imágenes con Backblaze B2 y Multer

Este documento sirve como guía paso a paso para el futuro, cuando decidas activar la subida de imágenes de tus propiedades en el Backend. ¡No te preocupes por desarrollarlo ahora! Consérvalo para cuando llegue el momento.

---

## Tareas Rapidas quse deben hacer:
### Crear un modelo de ducmentos
En este modelo Crear un modelo Verificaciones o Documentos que guarde:

usuario (ref a Users).

tipoDocumento (enum: 'cedula', 'pasaporte', 'matricula', 'recibo', etc.).

urlDocumento (la URL en Backblaze B2).

estado (pendiente, aprobado, rechazado).

fechaSubida.

Este modelo nos ayudara a verificar a los usuarios que quieran convertirse en propietarios

## 🧐 1. Entendiendo el Problema y la Solución (Explicación Sencilla)

### El Problema:
Las imágenes y los videos son archivos muy pesados. Si los guardamos directamente dentro de MongoDB, la base de datos se volverá lenta y costosa muy rápido. Además, MongoDB no está diseñado para almacenar archivos binarios grandes.

### La Solución:
Utilizaremos un sistema dividido en tres partes:
1. **MongoDB:** Solo guardará "enlaces de texto" (URLs) que apunten a dónde están las imágenes.
2. **Backblaze B2:** Es un disco duro gigante en la nube (un servicio de almacenamiento de objetos o "Bucket") donde se guardarán los archivos reales. Es ultra barato y te da 10 GB gratis.
3. **Tu servidor (Node.js):** Actuará como el puente que recibe las fotos del asesor, las comprime para que no pesen tanto y las manda a Backblaze B2.

---

## 🛠️ 2. Herramientas que usaremos (Tus dependencias)

*   **`multer`** (Ya lo tienes instalado): Sirve para que tu ruta de Express sea capaz de recibir archivos de fotos en lugar de solo texto.
*   **`sharp`** (Por instalar a futuro): Una librería que agarra la foto original, la achica si es muy gigante y la transforma a formato `.webp` (el formato que usa Google y las webs modernas porque no pierde calidad y pesa la mitad que un JPG).
*   **`@aws-sdk/client-s3`** (Por instalar a futuro): La librería oficial para conectarnos con Backblaze B2. Se llama "S3" porque Backblaze utiliza el mismo sistema de comunicación que Amazon Web Services.

---

## 📋 3. Pasos a seguir en el futuro (El Checklist)

### Paso A: Preparar Backblaze B2
1. Crear una cuenta gratuita en [Backblaze](https://backblaze.com).
2. Crear un **Bucket** (una cubeta/carpeta pública) para tu proyecto.
3. Generar las llaves de acceso (`Application Key ID` y `Application Key`).
4. Guardar estas llaves de forma segura en tu archivo `.env` de tu proyecto backend.

### Paso B: Actualizar tu Middleware de Validación (`validarPropiedad.js`)
Actualmente creamos un validador que revisa textos como el departamento o el precio. Tu modelo de Mongoose usa un sistema de sub-documentos para las áreas:
```javascript
// Dentro de tu inmuebleSchema tienes:
areas: [areasCasaSchema] // Donde cada área pide un nombre, imagen1, imagen2, etc.
```
Cuando subas imágenes, el validador simplemente tendrá que asegurar que los textos del formulario lleguen bien, y dejar que el siguiente paso maneje los archivos de las áreas.

### Paso C: Crear el procesador de imágenes (El Middleware de Multer)
Crearás un archivo en tu carpeta `middleware` (por ejemplo, `subirImagenes.js`). Este código hará lo siguiente de forma automática cada vez que un usuario suba una propiedad:
1. Multer atrapa las fotos que vienen del formulario.
2. Sharp toma esas fotos en la memoria del servidor, las comprime y las convierte a WebP.
3. El SDK de AWS toma ese archivo comprimido y lo sube a tu Bucket de Backblaze B2.
4. Backblaze responde con la URL pública de la imagen (ej: `https://backblazeb2.com`).
5. Tu código inyecta esa URL en el `req.body` dentro del arreglo de `areas` para que Mongoose lo guarde en tu base de datos.

### Paso D: Conectar todo en tu ruta `POST`
Tu ruta final se verá limpia y estructurada combinando tus guardianes uno tras otro:

```javascript
// EJEMPLO VISUAL DE TU RUTA FUTURA:
router.post(
    '/', 
    verificarToken, 
    verificarPublicante, 
    upload.fields([{ name: 'fotosAreas', maxCount: 10 }]), // <-- Multer atrapa los archivos
    validarPropiedad,                                      // <-- Revisa tus textos obligatorios
    procesarYSubirABackblaze,                             // <-- Comprime y sube a la nube
    async (req, res) => {
        // Para cuando llegues aquí, req.body.areas ya tendrá las URLs reales de Backblaze creadas en el paso anterior.
        try {
            const datosInmueble = { ...req.body, propietario: req.usuario.id, likes: 0 };
            const nuevo = await Propiedad.create(datosInmueble);
            res.status(201).json(nuevo);
        } catch (err) {
            res.status(400).json({ error: err.message }); 
        }
    }
);
```

---

## 🎯 4. Conclusión para tu tranquilidad actual
Tu modelo de datos está perfectamente diseñado para este flujo. No requieres alterar tus esquemas de Mongoose actuales (`areasCasaSchema` o `inmuebleSchema`) porque registrar un enlace de texto de Backblaze es exactamente lo mismo para MongoDB que registrar cualquier otra cadena de texto (`type: String`). 

¡Vas por excelente camino! Concéntrate en terminar tus rutas de consulta, filtros y lógica de negocio tradicional. La multimedia será pan comido una vez tengas dominado Express.



# 🔐 Plan de Ciberseguridad Futuro: Recuperación de Cuenta por Código Temporal

Guarda este reporte en tus notas de Markdown (`.md`) para cuando estés listo para programar el flujo de recuperación de contraseñas. Este sistema incluye la protección contra inyección de arreglos `[]` y control de expiración de códigos en el Backend.

---

## 🧭 1. El Flujo de Trabajo Técnico (Explicación Sencilla)

Para recuperar una cuenta de forma segura sin haber iniciado sesión, se requieren **dos rutas independientes** en tu archivo de autenticación:

1. **Ruta 1 (`POST /solicitar-recuperacion`):** El usuario escribe su email. El backend genera un código numérico aleatorio, le pone una fecha de caducidad (ej: 15 minutos) y lo guarda en el documento del usuario en MongoDB. Luego, envía ese código al correo del usuario.
2. **Ruta 2 (`POST /restablecer-password`):** El usuario envía el email, el código que recibió y su nueva contraseña. El backend valida minuciosamente los tipos de datos, comprueba que el código coincida y que no haya expirado, encripta la nueva contraseña con `bcrypt` y limpia los códigos de la base de datos.

---

## 🗄️ 2. Modificación del Modelo de Usuario (`Usuario.js`)

Para que esto funcione, tu esquema de usuarios en MongoDB necesitará tres campos nuevos opcionales (no obligatorios) que sirvan como bóveda temporal:

```javascript
// Agrega estos campos dentro de tu usuarioSchema:
codigoRecuperacion: {
    type: String,
    default: null
},
codigoExpiracion: {
    type: Date,
    default: null
},
intentosRecuperacion: {
    type: Number,
    default: 0
}
```

---

## 🛠️ 3. Código Base Futuro para tus Rutas (`auth.js`)

Aquí tienes la estructura robusta y blindada contra ataques de inyección de parámetros (`[]` o `{}`) para añadir a tu backend:

### Paso A: Ruta para solicitar el código
```javascript
const crypto = require('crypto'); // Nativo de Node.js

router.post('/solicitar-recuperacion', limitadorLogin, async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Blindaje contra inyección de tipos [] {}
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: "El correo electrónico debe ser texto puro." });
        }

        const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
        
        // 2. CIBERSEGURIDAD: Si el email no existe, respondemos con éxito simulado.
        // Esto evita que los hackers descubran qué correos están registrados en tu plataforma.
        if (!usuario) {
            return res.json({ mensaje: "Si el correo está registrado, se enviará un código de verificación." });
        }

        // 3. Generar un código numérico aleatorio seguro de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Establecer tiempo de vida: 15 minutos desde ahora
        const expiracion = new Date(Date.now() + 15 * 60 * 1000);

        // 4. Guardar datos de recuperación en MongoDB y resetear contador de intentos
        usuario.codigoRecuperacion = codigo;
        usuario.codigoExpiracion = expiracion;
        usuario.intentosRecuperacion = 0;
        await usuario.save();

        // 5. AQUÍ ENVIARÁS EL CORREO ELECTRONICO (Ej: usando nodemailer)
        // Por ahora, puedes ver el código en la consola mientras desarrollas:
        console.log(`📩 Código enviado a ${email}: ${codigo}`);

        res.json({ mensaje: "Si el correo está registrado, se enviará un código de verificación." });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

### Paso B: Ruta para validar código y cambiar contraseña
```javascript
router.post('/restablecer-password', limitadorLogin, async (req, res) => {
    try {
        const { email, codigo, passwordNueva } = req.body;

        // 1. BLINDAJE ULTRA ESTRICTO: Control de tipos para evitar inyección de arreglos []
        if (typeof email !== 'string' || typeof codigo !== 'string' || typeof passwordNueva !== 'string') {
            return res.status(400).json({ error: "Los datos enviados deben ser texto puro." });
        }

        if (passwordNueva.length < 6) {
            return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
        }

        const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!usuario || !usuario.codigoRecuperacion) {
            return res.status(400).json({ error: "Solicitud de recuperación inválida o vencida." });
        }

        // 2. CIBERSEGURIDAD: Control de intentos para evitar ataques de fuerza bruta al código de 6 dígitos
        if (usuario.intentosRecuperacion >= 5) {
            return res.status(429).json({ error: "Demasiados intentos fallidos. Solicita un nuevo código." });
        }

        // 3. Verificar si el código ya expiró por tiempo
        if (new Date() > usuario.codigoExpiracion) {
            return res.status(400).json({ error: "El código ha expirado. Por favor, solicita uno nuevo." });
        }

        // 4. Comparar el código enviado por el usuario
        if (codigo !== usuario.codigoRecuperacion) {
            usuario.intentosRecuperacion += 1; // Sumamos un intento fallido
            await usuario.save();
            return res.status(401).json({ error: "El código de verificación es incorrecto." });
        }

        // 5. Todo está correcto: Encriptamos la nueva contraseña
        const hash = await bcrypt.hash(passwordNueva, 10);

        // Actualizamos contraseña y limpiamos los campos temporales de seguridad inmediatamente
        usuario.password = hash;
        usuario.codigoRecuperacion = null;
        usuario.codigoExpiracion = null;
        usuario.intentosRecuperacion = 0;
        await usuario.save();

        res.json({ mensaje: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

---

## 🛡️ 4. Análisis de Defensa Incorporado

*   **Bloqueo de Inyección de Tipo (`typeof !== 'string'`):** Si el hacker intenta mandar `codigo: [1234, 5678, 9012]` para tratar de adivinar múltiples combinaciones en una sola petición, el código lo frena en la primera línea de ejecución devolviendo un Error 400.
*   **Contador de Destrucción de Sesión (`intentosRecuperacion`):** Si usan un script para adivinar el código de 6 dígitos (haciendo peticiones consecutivas rápidamente), el usuario se bloqueará automáticamente al quinto fallo, obligándolos a generar otro código y rompiendo el ataque automatizado.
*   **Éxito Simulado:** Al responder exactamente lo mismo si el correo existe o no en la ruta de solicitud, impides que los atacantes usen tu API para validar bases de datos de correos robados de internet.
