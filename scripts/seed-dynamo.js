#!/usr/bin/env node
'use strict';
/**
 * scripts/seed-dynamo.js
 * ──────────────────────────────────────────────────────────────
 * One-time script to:
 *   1. Create JanMitra_Schemes and JanMitra_Users tables in DynamoDB
 *   2. Seed the Schemes table from data/schemes.json
 *
 * Usage:
 *   node scripts/seed-dynamo.js
 *
 * Requires AWS credentials in .env or environment.
 */

require('dotenv').config();
const { DynamoDBClient, CreateTableCommand,
        DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const path = require('path');
const fs   = require('fs');

const REGION = process.env.AWS_REGION || 'us-east-1';
const SCHEMES_TABLE = process.env.DYNAMO_SCHEMES_TABLE || 'JanMitra_Schemes';
const USERS_TABLE   = process.env.DYNAMO_USERS_TABLE   || 'JanMitra_Users';

if (!process.env.AWS_ACCESS_KEY_ID) {
  console.error('❌  AWS_ACCESS_KEY_ID not set. Add it to .env first.');
  process.exit(1);
}

const raw = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
  }
});
const client = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true }
});

// ── Helpers ───────────────────────────────────────────────────
async function tableExists(name) {
  try {
    await raw.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false;
    throw e;
  }
}

async function waitForActive(name) {
  process.stdout.write(`  Waiting for ${name} to become ACTIVE `);
  for (let i = 0; i < 30; i++) {
    const { Table } = await raw.send(new DescribeTableCommand({ TableName: name }));
    if (Table.TableStatus === 'ACTIVE') { console.log('✅'); return; }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Table ${name} did not become ACTIVE in time`);
}

async function createTable(name, partitionKey) {
  if (await tableExists(name)) {
    console.log(`  ⚡ Table ${name} already exists — skipping create`);
    return;
  }
  console.log(`  Creating table: ${name} ...`);
  await raw.send(new CreateTableCommand({
    TableName:             name,
    BillingMode:           'PAY_PER_REQUEST', // no capacity planning needed
    AttributeDefinitions:  [{ AttributeName: partitionKey, AttributeType: 'S' }],
    KeySchema:             [{ AttributeName: partitionKey, KeyType: 'HASH' }]
  }));
  await waitForActive(name);
}

async function seedSchemes() {
  const schemesFile = path.join(__dirname, '..', 'data', 'schemes.json');
  if (!fs.existsSync(schemesFile)) {
    console.warn('  ⚠️  data/schemes.json not found — skipping seed');
    return;
  }

  const schemes = JSON.parse(fs.readFileSync(schemesFile, 'utf8'));
  console.log(`  Seeding ${schemes.length} schemes into ${SCHEMES_TABLE} ...`);

  // DynamoDB BatchWrite: max 25 per call
  const chunks = [];
  for (let i = 0; i < schemes.length; i += 25) chunks.push(schemes.slice(i, i + 25));

  for (const chunk of chunks) {
    await client.send(new BatchWriteCommand({
      RequestItems: {
        [SCHEMES_TABLE]: chunk.map(s => ({
          PutRequest: {
            Item: {
              schemeId:    s.id,        // partition key
              ...s
            }
          }
        }))
      }
    }));
  }
  console.log(`  ✅ Seeded ${schemes.length} schemes`);
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  console.log(`\n🚀 JanMitra DynamoDB Setup (region: ${REGION})\n`);

  console.log('📦 Creating tables...');
  await createTable(SCHEMES_TABLE, 'schemeId');
  await createTable(USERS_TABLE,   'userId');

  console.log('\n🌱 Seeding data...');
  await seedSchemes();

  console.log('\n✅  Done! Tables ready:');
  console.log(`   • ${SCHEMES_TABLE}  (partition key: schemeId)`);
  console.log(`   • ${USERS_TABLE}    (partition key: userId)\n`);
  console.log('Add these to your .env if not already set:');
  console.log(`   DYNAMO_SCHEMES_TABLE=${SCHEMES_TABLE}`);
  console.log(`   DYNAMO_USERS_TABLE=${USERS_TABLE}\n`);
})().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
