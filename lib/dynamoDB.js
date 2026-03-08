'use strict';
/**
 * lib/dynamoDB.js
 * ──────────────────────────────────────────────────────────────
 * Singleton DynamoDB DocumentClient + convenience helpers.
 * Returns isConfigured() = false when no AWS credentials are
 * present, letting callers fall back to local JSON/file storage.
 */

require('dotenv').config();

const { DynamoDBClient }        = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient,
        GetCommand, PutCommand,
        UpdateCommand, DeleteCommand,
        ScanCommand, QueryCommand,
        BatchWriteCommand }      = require('@aws-sdk/lib-dynamodb');

// ── Check whether AWS credentials are available ───────────────
function isConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

// ── Build the client lazily so missing creds don't crash boot ─
let docClient = null;

function getClient() {
  if (docClient) return docClient;
  if (!isConfigured()) return null;

  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
    }
  });

  docClient = DynamoDBDocumentClient.from(raw, {
    marshallOptions:   { removeUndefinedValues: true },
    unmarshallOptions: { wrapNumbers: false }
  });

  return docClient;
}

// ── Table names (override via env vars if needed) ─────────────
const TABLES = {
  SCHEMES: process.env.DYNAMO_SCHEMES_TABLE || 'JanMitra_Schemes',
  USERS:   process.env.DYNAMO_USERS_TABLE   || 'JanMitra_Users',
};

// ── Helpers ───────────────────────────────────────────────────
async function getItem(table, key) {
  const client = getClient();
  if (!client) return null;
  const { Item } = await client.send(new GetCommand({ TableName: table, Key: key }));
  return Item || null;
}

async function putItem(table, item) {
  const client = getClient();
  if (!client) throw new Error('DynamoDB not configured');
  await client.send(new PutCommand({ TableName: table, Item: item }));
}

async function updateItem(table, key, updateExpr, exprAttrValues, exprAttrNames) {
  const client = getClient();
  if (!client) throw new Error('DynamoDB not configured');
  await client.send(new UpdateCommand({
    TableName:                 table,
    Key:                       key,
    UpdateExpression:          updateExpr,
    ExpressionAttributeValues: exprAttrValues,
    ...(exprAttrNames && { ExpressionAttributeNames: exprAttrNames })
  }));
}

async function scanTable(table, filterExpr, exprAttrValues) {
  const client = getClient();
  if (!client) return [];
  const params = { TableName: table };
  if (filterExpr)     params.FilterExpression          = filterExpr;
  if (exprAttrValues) params.ExpressionAttributeValues = exprAttrValues;
  const { Items = [] } = await client.send(new ScanCommand(params));
  return Items;
}

async function batchWrite(table, items) {
  const client = getClient();
  if (!client) throw new Error('DynamoDB not configured');
  // DynamoDB BatchWrite accepts max 25 items per call
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));

  for (const chunk of chunks) {
    await client.send(new BatchWriteCommand({
      RequestItems: {
        [table]: chunk.map(item => ({ PutRequest: { Item: item } }))
      }
    }));
  }
}

module.exports = { isConfigured, getClient, TABLES, getItem, putItem, updateItem, scanTable, batchWrite };
