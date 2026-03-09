module.exports = {
  apps: [
    {
      name: "gj-backend",
      // JS compilado por `npm run build` en backend/
      script: "dist/main.js",
      cwd: "/home/gj-logistica/backend",
      instances: 1,
      exec_mode: "fork",
      // Reinicio automático si consume más de 400 MB
      max_memory_restart: "400M",
      // Variables de entorno de producción
      // ⚠️  El resto de variables (DB, JWT, MAIL) van en el .env del servidor
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      // Logs
      out_file: "/var/log/pm2/gj-backend.out.log",
      error_file: "/var/log/pm2/gj-backend.err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Política de reinicios
      autorestart: true,
      watch: false,
      min_uptime: "5s",
      max_restarts: 10,
    },
  ],
};
