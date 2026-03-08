const express = require('express');
const router = express.Router();
const https = require('https');
require('dotenv').config();

// ── Amazon Bedrock (Claude) — primary AI provider ──────────────
let bedrockClient = null;
let InvokeModelCommand = null;
try {
  const sdk = require('@aws-sdk/client-bedrock-runtime');
  bedrockClient = new sdk.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
    } : undefined // falls back to IAM role / credential chain
  });
  InvokeModelCommand = sdk.InvokeModelCommand;
  console.log('✅ Amazon Bedrock client initialized');
} catch (e) {
  console.warn('⚠️  Bedrock SDK not available, will use Gemini fallback:', e.message);
}

const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';

async function bedrockChat(systemPrompt, messages) {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    temperature: 0.4,
    system: systemPrompt,
    messages // [{role:'user'|'assistant', content:'...'}]
  });

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body
  });

  const response = await bedrockClient.send(command);
  const decoded = JSON.parse(Buffer.from(response.body).toString('utf-8'));
  return decoded.content?.[0]?.text?.trim() || '';
}

// ── Gemini Fallback ────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

function geminiRequest(apiKey, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: messages,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
    });
    const url = new URL(`${GEMINI_URL}?key=${apiKey}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── System Prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are JanMitra AI, a trusted companion for Indian citizens. You help people discover government welfare schemes, know their legal rights, find government jobs, and access civic services. You are powered by Amazon Bedrock.

You have deep knowledge of:
- Government Schemes: PM Awas Yojana (PMAY), PM-KISAN, Ayushman Bharat PM-JAY, PM Mudra Yojana, PM Jan Dhan Yojana, PM Ujjwala Yojana, PM Fasal Bima Yojana, MGNREGA, Post Matric Scholarship, National Scholarship Portal, Sukanya Samriddhi, Atal Pension Yojana, PM Vishwakarma
- Legal Rights: Labour rights (minimum wages, MGNREGA entitlement, EPF, maternity leave), Consumer rights (Consumer Forum, RERA, TRAI), RTI Act 2005 (rtionline.gov.in, ₹10 fee, 30-day response), Right to Education (RTE Act, 25% EWS seats, free schooling 6-14 years), Women's rights (Domestic Violence Act 2005, POSH Act, zero FIR), Farmer rights (MSP, crop insurance, land records, Bhulekh)
- Government Jobs: SSC CGL/MTS/CHSL, RRB NTPC/ALP, IBPS PO/Clerk, UPSC CAPF, Agniveer/NDA, State PSC/Police, PMKVY skill training, ITI courses, NCS portal
- Civic Services: Ration card, Voter ID (voterportal.eci.gov.in), Aadhaar update (myaadhaar.uidai.gov.in), birth/caste certificates, PDS/ration complaints
- Helplines: 112 (emergency), 181 (women), 1098 (childline), 1930 (cyber crime), 14555 (Ayushman), 1800-11-4000 (consumer), 15100 (legal aid/NALSA), 1800-180-1551 (kisan), 1800-11-7979 (labour)
- Documents: Aadhaar, ration card, income certificate, caste certificate, land records, job card

RULES:
1. Reply in the same language as the user (Hindi/Hinglish/English)
2. Be accurate — never invent scheme or exam details
3. Format using HTML: <strong> for key terms, <br> for line breaks
4. Use ₹ for amounts
5. Include internal links where relevant:
   - /rights.html for legal rights and helplines
   - /jobs.html for government jobs and exams
   - /checklist.html?scheme=SCHEME_ID (IDs: pm-awas, pm-kisan, ayushman-bharat, pm-mudra, post-matric-scholarship)
   - /eligibility.html for eligibility checker
   - /schemes.html for all schemes
6. Keep replies concise: 3-8 lines
7. Cover: government schemes, legal rights, jobs, civic services, health, education — do NOT redirect away from these topics

RESPONSE FORMAT - always respond with valid JSON only:
{"reply":"<HTML formatted answer>","suggestions":["question1","question2","question3"]}`;

// Seed for Gemini (role-plays the system prompt since Gemini uses contents[])
const GEMINI_SEED = [
  { role: 'user',  parts: [{ text: SYSTEM_PROMPT }] },
  { role: 'model', parts: [{ text: '{"reply":"Understood! I am JanMitra AI, ready to help Indian citizens find government schemes.","suggestions":["Show popular schemes","Check PM Awas eligibility","What documents do I need?"]}' }] }
];

// ── Session Store ──────────────────────────────────────────────
// sessions[id] = { anthropic: [{role,content}], gemini: [{role,parts}] }
const sessions = new Map();

function getSession(sid) {
  if (!sessions.has(sid)) {
    sessions.set(sid, {
      anthropic: [],            // Bedrock/Claude messages (system prompt passed separately)
      gemini: [...GEMINI_SEED]  // Gemini messages (seed included)
    });
  }
  return sessions.get(sid);
}

// Prune old sessions every hour
setInterval(() => {
  if (sessions.size > 500) {
    Array.from(sessions.keys()).slice(0, 200).forEach(k => sessions.delete(k));
  }
}, 3600000);

// ── POST /api/chat/message ─────────────────────────────────────
router.post('/message', async (req, res) => {
  const { message, sessionId, language } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sid = sessionId || 'default';
  const session = getSession(sid);
  const cleanMsg = message.trim();
  const langInstruction = language
    ? `\n[Important: You MUST reply entirely in ${language}. Do not use any other language.]`
    : '';

  let rawText = '';
  let usedProvider = 'gemini';

  // ── Try Amazon Bedrock first ─────────────────────────────────
  if (bedrockClient && InvokeModelCommand) {
    try {
      const anthropicMessages = [
        ...session.anthropic,
        { role: 'user', content: cleanMsg + langInstruction }
      ];

      rawText = await bedrockChat(SYSTEM_PROMPT, anthropicMessages);
      usedProvider = 'bedrock';

      // Commit to session (store without lang instruction)
      session.anthropic.push({ role: 'user',      content: cleanMsg });
      session.anthropic.push({ role: 'assistant', content: rawText });

      // Bound history to last 40 messages (20 turns)
      if (session.anthropic.length > 40) {
        session.anthropic = session.anthropic.slice(-40);
      }
    } catch (bedrockErr) {
      console.error('Bedrock error, falling back to Gemini:', bedrockErr.message);
      rawText = '';
    }
  }

  // ── Gemini Fallback ──────────────────────────────────────────
  if (!rawText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: 'AI service is temporarily unavailable. Please try again shortly.<br><br><a href="/schemes.html" style="color:#D4611A;font-weight:700">Browse Schemes →</a>',
        suggestions: ['Show all schemes', 'Check eligibility', 'Document checklist'],
        sessionId: sid
      });
    }

    try {
      const geminiHistory = session.gemini;
      geminiHistory.push({ role: 'user', parts: [{ text: cleanMsg + langInstruction }] });

      const data = await geminiRequest(apiKey, geminiHistory);
      if (data.error) throw new Error(data.error.message || 'Gemini API error');

      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Swap last entry with clean version then append model
      geminiHistory[geminiHistory.length - 1] = { role: 'user', parts: [{ text: cleanMsg }] };
      geminiHistory.push({ role: 'model', parts: [{ text: rawText }] });

      if (geminiHistory.length > 22) {
        session.gemini = [...GEMINI_SEED, ...geminiHistory.slice(-20)];
      }
    } catch (geminiErr) {
      console.error('Gemini error:', geminiErr.message);
      return res.json({
        reply: 'I\'m having trouble connecting. Please try again in a moment.<br><br><a href="/schemes.html" style="color:#D4611A;font-weight:700">Browse Schemes →</a> &nbsp; <a href="/eligibility.html" style="color:#D4611A;font-weight:700">Check Eligibility →</a>',
        suggestions: ['Show all schemes', 'Check eligibility', 'Document checklist'],
        sessionId: sid
      });
    }
  }

  // ── Parse JSON response ──────────────────────────────────────
  let reply, suggestions;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    reply = parsed.reply || rawText;
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
  } catch {
    reply = rawText;
    suggestions = ['Show popular schemes', 'Check eligibility', 'Document checklist'];
  }

  res.json({ reply, suggestions, sessionId: sid, provider: usedProvider });
});

module.exports = router;
