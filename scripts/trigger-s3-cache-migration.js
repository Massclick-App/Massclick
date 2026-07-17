#!/usr/bin/env node

/**
 * Trigger S3 cache header migration for specific scopes
 *
 * Usage:
 *   node scripts/trigger-s3-cache-migration.js --scope=advertisements
 *   node scripts/trigger-s3-cache-migration.js --scope=all --batch-size=200
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../server/.env') });

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ Error: ADMIN_API_TOKEN not set in .env');
  console.error('Set ADMIN_API_TOKEN to an admin user token to trigger migrations.');
  process.exit(1);
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = { scope: 'advertisements', batchSize: 100, retryCount: 3 };

  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key === '--scope') opts.scope = value;
    if (key === '--batch-size') opts.batchSize = parseInt(value, 10);
    if (key === '--retry-count') opts.retryCount = parseInt(value, 10);
  });

  return opts;
};

const main = async () => {
  const { scope, batchSize, retryCount } = parseArgs();

  console.log(`📦 Starting S3 cache header migration`);
  console.log(`   Scope: ${scope}`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Retry count: ${retryCount}`);
  console.log();

  try {
    const response = await fetch(`${API_URL}/api/admin/system-settings/s3-cache-header-migration/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        scopeKey: scope,
        batchSize,
        retryCount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Migration start failed:', data.message);
      process.exit(1);
    }

    const job = data.data;
    console.log('✅ Migration job created');
    console.log(`   Job ID: ${job._id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Scope: ${job.scopeKey}`);
    console.log();
    console.log('📊 You can check progress with:');
    console.log(`   curl -H "Authorization: Bearer \$ADMIN_TOKEN" \\`);
    console.log(`     "${API_URL}/api/admin/system-settings/s3-cache-header-migration/${job._id}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

main();
