// Loads data/tours.seed.json into MongoDB.
//
//   npm run seed:tours            add tours that are missing, never touch existing ones
//   npm run seed:tours -- --force overwrite existing tours with the seed values
//
// Safe to run repeatedly: tours are matched by slug, so nothing is duplicated and
// edits made in the admin dashboard survive unless you pass --force.
import fs from 'node:fs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Tour from '../models/Tour.js';

const force = process.argv.includes('--force');
const tours = JSON.parse(fs.readFileSync(new URL('../data/tours.seed.json', import.meta.url), 'utf8'));

await mongoose.connect(env.MONGO_URI);

let created = 0;
let updated = 0;
let skipped = 0;

for (const tour of tours) {
  const exists = await Tour.exists({ slug: tour.slug });
  if (exists && !force) {
    skipped += 1;
    continue;
  }
  await Tour.updateOne({ slug: tour.slug }, { $set: tour }, { upsert: true, runValidators: true });
  if (exists) updated += 1;
  else created += 1;
}

console.log(`Tours: ${created} created, ${updated} overwritten, ${skipped} left as is.`);
await mongoose.disconnect();
