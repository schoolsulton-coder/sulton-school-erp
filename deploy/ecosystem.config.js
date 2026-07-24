// PM2 konfiguratsiyasi — backend (NestJS) va frontend (Next.js)
// Ishga tushirish (repo ildizidan): pm2 start deploy/ecosystem.config.js
const path = require('path');
const root = path.join(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'sulton-backend',
      cwd: path.join(root, 'backend'),
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '450M',
      autorestart: true,
    },
    {
      name: 'sulton-frontend',
      cwd: path.join(root, 'frontend'),
      script: path.join(root, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3005',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '450M',
      autorestart: true,
    },
  ],
};
