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

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const jsonPath = args.find((a) => !a.startsWith('--'));
  const baseOnly = args.includes('--base-only');

  if (!jsonPath) {
    console.log('Usage: node tools/validate-state.js <path-to-agent-state.json> [--base-only]');
    console.log('  Validates agent-state.json against JSON Schema.');
    console.log('  Files with test_plan field are validated against merged (base + test-plan) schema.');
    console.log('  Files without test_plan are validated against base schema.');
    console.log('  --base-only: skip full validation; for base-only files validates against base schema.');
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
    process.exit(0);
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
  process.exit(0);
}

main();
