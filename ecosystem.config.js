module.exports = {
  apps: [
    {
      name: 'gj-backend',
      // Ruta al JS compilado (después de `npm run build` en backend/)
      script: 'dist/main.js',
      cwd: '/var/www/gj-logistica/backend',
      instances: 1,
      exec_mode: 'fork',
      // Reinicio automático si consume más de 400MB
      max_memory_restart: '400M',
      // Variables de entorno de producción
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      out_file: '/var/log/pm2/gj-backend.out.log',
      error_file: '/var/log/pm2/gj-backend.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Reiniciar si el proceso cae
      autorestart: true,
      watch: false,
      // Esperar 5s antes de marcar como online (tiempo para conectar a MySQL)
      min_uptime: '5s',
      max_restarts: 10,
    },
  ],
};
