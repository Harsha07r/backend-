import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { ensureSuperAdmin } from './services/bootstrapAdmin.js';

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB');

  await ensureSuperAdmin();

  const server = app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
