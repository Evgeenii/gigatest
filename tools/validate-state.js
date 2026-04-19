#!/usr/bin/env node
// Usage: node tools/validate-state.js <path-to-agent-state.json> [--base-only]
// Exit: 0 = valid, 1 = invalid + error details to stdout
//
// Validates agent-state.json against agent-state-schema.json.
// If the file has a test_plan field, it is validated against the merged
// (base + test-plan) schema. Otherwise, pure base schema.
//
// --base-only: skip validation entirely for files with test_plan.
//              For files without test_plan, validate against base schema only.

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const path = require('path');
const fs = require('fs');

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function schemaDir() {
  return path.resolve(__dirname, '..', 'skills', 'agent-workflow-core');
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Build a merged schema that can be validated in a single AJV instance.
 * The test-plan schema uses allOf + $ref on base. We merge all properties
 * into one schema so that additionalProperties: false applies to the complete
 * set of known properties, not to fragments.
 */
function buildTestPlanSchema(baseSchema, testPlanSchema) {
  const merged = {
    $schema: baseSchema.$schema,
    title: testPlanSchema.title,
    description: testPlanSchema.description,
    type: 'object',
    additionalProperties: false,
    required: [],
    properties: {},
  };

  function addPropsFrom(schema) {
    if (schema.properties) {
      for (const [name, propSchema] of Object.entries(schema.properties)) {
        // Don't overwrite
        if (!merged.properties[name]) {
          merged.properties[name] = clone(propSchema);
        }
      }
    }
    if (schema.required) {
      for (const r of schema.required) {
        if (!merged.required.includes(r)) {
          merged.required.push(r);
        }
      }
    }
  }

  // Merge base schema
  addPropsFrom(baseSchema);

  // Merge test-plan extension (from allOf[1])
  if (testPlanSchema.allOf && testPlanSchema.allOf[1]) {
    addPropsFrom(testPlanSchema.allOf[1]);
  }

  // Copy definitions
  if (testPlanSchema.definitions) {
    merged.definitions = clone(testPlanSchema.definitions);
  } else if (baseSchema.definitions) {
    merged.definitions = clone(baseSchema.definitions);
  }

  return merged;
}

function formatErrors(ajvErrors) {
  return ajvErrors.map((err) => {
    const instancePath = err.instancePath || '/';
    const message = err.message || 'unknown error';
    return `  ${instancePath}: ${message}`;
  });
}

// ─── Semantic validation (beyond JSON Schema) ──────────────────────────────

/**
 * Perform semantic checks that JSON Schema cannot validate:
 *   - meta.* counts match actual plan.items
 *   - progress_percent formula is correct
 *   - memory.history is chronologically ordered
 *   - content_hash matches (if present)
 *
 * Returns { valid: boolean, errors: string[] }
 */
function validateSemantics(state) {
  const errors = [];
  const { plan, memory, session } = state;
  const items = plan.items || [];

  // 1. Count actual statuses
  const actualDone = items.filter((i) => i.status === 'done').length;
  const actualInProgress = items.filter((i) => i.status === 'in_progress').length;
  const actualPending = items.filter((i) => i.status === 'pending').length;
  const actualBlocked = items.filter((i) => i.status === 'blocked').length;
  const actualSkipped = items.filter((i) => i.status === 'skipped').length;

  // 2. Check meta.total_items
  if (plan.meta.total_items !== items.length) {
    errors.push(
      `plan.meta.total_items (${plan.meta.total_items}) != actual items count (${items.length})`
    );
  }

  // 3. Check meta.done
  if (plan.meta.done !== actualDone) {
    errors.push(
      `plan.meta.done (${plan.meta.done}) != count(status=done) items (${actualDone})`
    );
  }

  // 4. Check meta.in_progress
  if (plan.meta.in_progress !== actualInProgress) {
    errors.push(
      `plan.meta.in_progress (${plan.meta.in_progress}) != count(status=in_progress) items (${actualInProgress})`
    );
  }

  // 5. Check meta.pending
  if (plan.meta.pending !== actualPending) {
    errors.push(
      `plan.meta.pending (${plan.meta.pending}) != count(status=pending) items (${actualPending})`
    );
  }

  // 6. Check meta.blocked
  if (plan.meta.blocked !== actualBlocked) {
    errors.push(
      `plan.meta.blocked (${plan.meta.blocked}) != count(status=blocked) items (${actualBlocked})`
    );
  }

  // 7. Check meta.skipped
  if (plan.meta.skipped !== actualSkipped) {
    errors.push(
      `plan.meta.skipped (${plan.meta.skipped}) != count(status=skipped) items (${actualSkipped})`
    );
  }

  // 8. Check progress_percent
  const expectedProgress =
    items.length === 0 ? 0 : Math.round((actualDone / items.length) * 10000) / 100;
  if (Math.abs(plan.meta.progress_percent - expectedProgress) > 0.01) {
    errors.push(
      `plan.meta.progress_percent (${plan.meta.progress_percent}%) != done/total*100 (${expectedProgress}%)`
    );
  }

  // 9. Check history chronological order
  if (memory && memory.history && memory.history.length > 1) {
    for (let i = 1; i < memory.history.length; i++) {
      const prev = memory.history[i - 1].timestamp;
      const curr = memory.history[i].timestamp;
      if (new Date(prev) > new Date(curr)) {
        errors.push(
          `memory.history[${i - 1}].timestamp (${prev}) > [${i}].timestamp (${curr}): non-chronological order`
        );
      }
    }
  }

  // 10. Check content_hash integrity (if present)
  if (session && session.content_hash) {
    // Compute SHA-256 of the state excluding content_hash field
    const stateCopy = { ...state, session: { ...state.session } };
    delete stateCopy.session.content_hash;
    const raw = JSON.stringify(stateCopy, Object.keys(stateCopy).sort());
    computeSha256(raw).then((hash) => {
      if (hash !== session.content_hash) {
        errors.push(
          `session.content_hash (${session.content_hash.substring(0, 16)}...) does not match computed SHA-256 (${hash.substring(0, 16)}...)`
        );
      }
    });
  }

  return errors;
}

/** Compute SHA-256 hex string */
async function computeSha256(input) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonPath = args.find((a) => !a.startsWith('--'));
  const baseOnly = args.includes('--base-only');
  const skipSemantic = args.includes('--no-semantic');

  if (!jsonPath) {
    console.log('Usage: node tools/validate-state.js <path-to-agent-state.json> [--base-only] [--no-semantic]');
    console.log('  Validates agent-state.json against JSON Schema.');
    console.log('  Files with test_plan field are validated against merged (base + test-plan) schema.');
    console.log('  Files without test_plan are validated against base schema.');
    console.log('  --base-only: skip full validation; for base-only files validates against base schema.');
    console.log('  --no-semantic: skip semantic validation.');
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.log(`ERROR: File not found: ${jsonPath}`);
    process.exit(1);
  }

  let state;
  try {
    state = loadJson(jsonPath);
  } catch (err) {
    console.log(`ERROR: Invalid JSON in ${jsonPath}`);
    console.log(`  ${err.message}`);
    process.exit(1);
  }

  // Load schemas
  const baseSchemaPath = path.join(schemaDir(), 'agent-state-schema.json');
  const testPlanSchemaPath = path.join(schemaDir(), 'test-plan-state-schema.json');

  let baseSchema;
  try {
    baseSchema = loadJson(baseSchemaPath);
  } catch {
    console.log(`ERROR: Base schema not found: ${baseSchemaPath}`);
    process.exit(1);
  }

  // AJV instance with format support
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Ensure base has $id
  if (!baseSchema.$id) baseSchema.$id = 'agent-state-schema.json';

  if (!state.test_plan) {
    // Pure base file
    ajv.addSchema(baseSchema);
    const validateBase = ajv.getSchema('agent-state-schema.json');
    if (!validateBase(state)) {
      console.log(`VALIDATION FAILED: ${jsonPath}`);
      console.log('');
      console.log('[base schema errors]');
      formatErrors(validateBase.errors).forEach((e) => console.log(e));
      process.exit(1);
    }
    console.log(`VALID: ${jsonPath} (passed base schema)`);

    // Semantic validation
    if (!skipSemantic) {
      const semanticErrors = validateSemantics(state);
      setTimeout(() => {
        if (semanticErrors.length > 0) {
          console.log('');
          console.log(`SEMANTIC VALIDATION FAILED: ${jsonPath}`);
          console.log('');
          semanticErrors.forEach((e) => console.log(`  ${e}`));
          process.exit(1);
        }
        console.log(`SEMANTIC OK: ${jsonPath} (all semantic checks passed)`);
      }, 100);
    } else {
      process.exit(0);
    }
    return;
  }

  // File with test_plan — validate against merged schema
  if (baseOnly) {
    console.log(`SKIP: ${jsonPath} has test_plan — run without --base-only`);
    process.exit(0);
  }

  let testPlanSchema;
  try {
    testPlanSchema = loadJson(testPlanSchemaPath);
  } catch {
    console.log(`ERROR: Test-plan schema not found: ${testPlanSchemaPath}`);
    process.exit(1);
  }

  const mergedSchema = buildTestPlanSchema(baseSchema, testPlanSchema);

  let validateMerged;
  try {
    validateMerged = ajv.compile(mergedSchema);
  } catch (err) {
    console.log(`ERROR: Could not compile merged test-plan schema`);
    console.log(`  ${err.message}`);
    process.exit(1);
  }

  if (!validateMerged(state)) {
    console.log(`VALIDATION FAILED: ${jsonPath}`);
    console.log('');
    console.log('[test-plan schema errors]');
    formatErrors(validateMerged.errors).forEach((e) => console.log(e));
    process.exit(1);
  }

  console.log(`VALID: ${jsonPath} (passed both base and test-plan schemas)`);

  // Semantic validation
  if (!skipSemantic) {
    const semanticErrors = validateSemantics(state);

    // Content hash check is async — wait for it
    if (semanticErrors.length > 0 || (state.session && state.session.content_hash)) {
      // Give async hash check time to complete
      setTimeout(() => {
        if (semanticErrors.length > 0) {
          console.log('');
          console.log(`SEMANTIC VALIDATION FAILED: ${jsonPath}`);
          console.log('');
          semanticErrors.forEach((e) => console.log(`  ${e}`));
          process.exit(1);
        }
        console.log(`SEMANTIC OK: ${jsonPath} (all semantic checks passed)`);
        process.exit(0);
      }, 100);
    } else {
      process.exit(0);
    }
  } else {
    process.exit(0);
  }
}

main();
