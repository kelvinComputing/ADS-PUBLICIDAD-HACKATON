# 🚀 ADS Application

Una aplicación web moderna para la gestión de ADS, construida con [Astro](https://astro.build/), autenticación segura con [Clerk](https://clerk.dev/) y comunicación eficiente con un backend centralizado.

## 🧩 Tecnologías principales

- 🌌 **[Astro](https://astro.build/)** – Framework moderno para construir sitios rápidos y optimizados.
- 🔐 **[Clerk](https://clerk.dev/)** – Autenticación y gestión de usuarios sin complicaciones.
- 🔗 *API Backend* – Conexión a un backend REST desarrollado con Django (desplegado en Render) para obtener, enviar y procesar datos de manera segura y eficiente.



## 🔐 Autenticación con Clerk

La aplicación usa Clerk para gestionar:

- Registro e inicio de sesión de usuarios
- Sesiones seguras
- Protección de rutas
- Acceso a datos del usuario actual desde frontend y middleware

> Clerk está integrado a través de sus SDKs para Astro y se configura fácilmente con las claves del proyecto desde el archivo .env.

## 🌐 Comunicación con el Backend

Las peticiones al backend se realizan utilizando fetch directamente desde los archivos JavaScript correspondientes, utilizando una constante base (API_BASE) que apunta al servidor Django alojado en Render.
Estas Funciones permiten:

- Obtener datos protegidos usando el token de Clerk
- Enviar formularios o datos de manera segura
- Manejar errores y respuestas de forma estandarizada

PD: Todos los datos que existen en el proyecto actualmente, son meramente ficticios, no se usan nombre de personas reales. 



🌐 *Producción:* [https://ads-publicidad.netlify.app/](https://ads-publicidad.netlify.app/)
