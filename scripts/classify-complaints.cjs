const fs = require('fs');
const path = require('path');

const COMPLAINTS_PATH = path.join(__dirname, '..', 'src', 'data', 'complaints.json');
const CLASSIFICATIONS_PATH = path.join(__dirname, '..', 'src', 'data', 'classifications.json');

const CATEGORIES = [
  'locked_account', 'verification', 'withdrawal',
  'customer_service', 'fraud', 'fees', 'other'
];

const BATCH_SIZE = 10;
const RPM_LIMIT = 15;
const DELAY_BETWEEN_BATCHES = Math.ceil(60000 / RPM_LIMIT); // ~4s between requests

// Determine which provider to use
const USE_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY;

async function getClient() {
  if (USE_ANTHROPIC) {
    const Anthropic = require('@anthropic-ai/sdk');
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or ANTHROPIC_API_KEY environment variable is required');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
}

function loadClassifications() {
  try {
    return JSON.parse(fs.readFileSync(CLASSIFICATIONS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveClassifications(classifications) {
  fs.writeFileSync(CLASSIFICATIONS_PATH, JSON.stringify(classifications, null, 2) + '\n');
}

function getUnclassifiedComplaints(complaints, classifications) {
  return complaints.filter(c => {
    const id = String(c.complaint_id);
    const narrative = c.complaint_what_happened;
    return narrative && narrative.length > 50 && !classifications[id];
  });
}

function buildPrompt(batch) {
  const complaintsText = batch.map((c, i) =>
    `Complaint ${i + 1} (ID: ${c.complaint_id}):\n${c.complaint_what_happened.slice(0, 1500)}`
  ).join('\n\n---\n\n');

  return `You are classifying consumer complaints about cryptocurrency companies.

Classify each complaint into exactly ONE category:
- locked_account: Account access issues (locked, frozen, suspended, can't login)
- verification: KYC/identity verification problems (documents, selfie, ID rejected)
- withdrawal: Can't withdraw or transfer funds out
- customer_service: Poor support, no response, long wait times
- fraud: Scams, unauthorized transactions, hacking, stolen funds, phishing
- fees: Unexpected fees, hidden charges, overcharged
- other: Doesn't fit above categories

IMPORTANT: Classify based on the PRIMARY issue, not incidental mentions. For example, if someone describes being scammed and their account was then closed, the primary issue is "fraud" not "locked_account".

Return ONLY valid JSON with no markdown formatting:
{"<complaint_id>": "<category>", ...}

${complaintsText}`;
}

async function callModel(client, prompt) {
  if (USE_ANTHROPIC) {
    const msg = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0].text.trim();
  }
  const result = await client.generateContent(prompt);
  return result.response.text().trim();
}

async function classifyBatch(model, batch, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prompt = buildPrompt(batch);
      const text = await callModel(model, prompt);

      // Extract JSON object from response (handles preamble text, code fences, etc.)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate categories
      const validated = {};
      for (const [id, category] of Object.entries(parsed)) {
        if (CATEGORIES.includes(category)) {
          validated[String(id)] = category;
        } else {
          console.warn(`  Invalid category "${category}" for ID ${id}, skipping`);
        }
      }
      return validated;
    } catch (err) {
      console.error(`  Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        const backoff = attempt * 5000;
        console.log(`  Retrying in ${backoff / 1000}s...`);
        await sleep(backoff);
      }
    }
  }
  console.error('  All retries failed for this batch, skipping');
  return {};
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Loading complaints...');
  const raw = JSON.parse(fs.readFileSync(COMPLAINTS_PATH, 'utf-8'));
  const complaints = raw.hits.hits.map(h => h._source);

  console.log('Loading existing classifications...');
  const classifications = loadClassifications();
  const existingCount = Object.keys(classifications).length;
  console.log(`  ${existingCount} existing classifications`);

  const unclassified = getUnclassifiedComplaints(complaints, classifications);
  console.log(`  ${unclassified.length} complaints need classification`);

  if (unclassified.length === 0) {
    console.log('Nothing to classify. Done.');
    return;
  }

  console.log(`Using ${USE_ANTHROPIC ? 'Anthropic Claude Haiku' : 'Gemini'} API`);
  const model = await getClient();

  const batches = [];
  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    batches.push(unclassified.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE}...`);
  let classified = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} complaints)...`);

    const results = await classifyBatch(model, batch);
    const count = Object.keys(results).length;
    classified += count;

    Object.assign(classifications, results);

    // Save after each batch for resilience
    if (count > 0) {
      saveClassifications(classifications);
    }

    console.log(`  Classified ${count}/${batch.length} | Total: ${classified} new, ${Object.keys(classifications).length} overall`);

    // Rate limit delay (skip after last batch)
    if (i < batches.length - 1) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\nDone! ${classified} new classifications. ${Object.keys(classifications).length} total.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
