#!/usr/bin/env node
// Usage: node tools/generate-report.js <path-to-agent-state.json> [output-path]
// Exit: 0 = generated, 1 = error
//
// Reads agent-state.json and generates test-plan.md.
// If output-path is omitted, writes it alongside the input JSON.

const fs = require('fs');
const path = require('path');

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Simple Handlebars-like template renderer for test-plan.md generation.
 * Supports: {{variable}}, {{#if var}}...{{/if}}, {{#if ...}}...{{else}}...{{/if}},
 * {{#each list}}...{{/each}}, {{join array, sep}}
 */
function renderTemplate(template, data) {
  let result = template;

  // First, handle {{#each}} blocks
  result = processEachBlocks(result, data);

  // Then handle {{#if}} blocks
  result = processIfBlocks(result, data);

  // Finally, handle simple {{variable}} references
  result = processVariables(result, data);

  return result;
}

function processEachBlocks(template, data) {
  const eachRegex = /\{\{(?:#each)\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  let match;

  // Keep iterating until no more {{#each}} blocks
  while ((match = eachRegex.exec(template)) !== null) {
    const fullPath = match[1];
    const blockContent = match[2];
    const collection = resolvePath(data, fullPath);

    if (!Array.isArray(collection) || collection.length === 0) {
      // Replace with "_Нет задач_" for plan.items or empty for others
      const replacement = fullPath === 'plan.items' ? '_Нет задач_' : '';
      template = template.replace(match[0], replacement);
      continue;
    }

    let rendered = '';
    for (const item of collection) {
      let block = blockContent;
      // Replace {{variable}} with item.field or nested field
      block = block.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, varPath) => {
        return resolvePath(item, varPath) != null ? resolvePath(item, varPath) : '';
      });
      // Handle {{#if}} inside each blocks
      block = processIfBlocksSimple(block, item);
      rendered += block;
    }

    template = template.replace(match[0], rendered);
    // Reset regex lastIndex since we modified the string
    eachRegex.lastIndex = 0;
  }

  return template;
}

function processIfBlocks(template, data) {
  const ifRegex = /\{\{#if\s+([\w.#]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
  let match;
  let maxIter = 50; // prevent infinite loops

  while ((match = ifRegex.exec(template)) !== null && maxIter-- > 0) {
    const fullPath = match[1];
    const trueBlock = match[2];
    const falseBlock = match[3] || '';
    const value = resolvePath(data, fullPath);

    const replacement = isTruthy(value) ? trueBlock : falseBlock;
    template = template.slice(0, match.index) + replacement + template.slice(match.index + match[0].length);
    ifRegex.lastIndex = match.index + replacement.length;
  }

  return template;
}

/**
 * Process {{#if}} blocks within an #each iteration (uses item context).
 */
function processIfBlocksSimple(template, item) {
  const ifRegex = /\{\{#if\s+([\w.#]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
  let match;
  let result = template;

  while ((match = ifRegex.exec(result)) !== null) {
    const fullPath = match[1];
    const trueBlock = match[2];
    const falseBlock = match[3] || '';
    const value = resolvePath(item, fullPath);

    const replacement = isTruthy(value) ? trueBlock : falseBlock;
    result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
    ifRegex.lastIndex = 0;
  }

  return result;
}

function processVariables(template, data) {
  return template.replace(/\{\{([\w.#]+)\}\}/g, (_, varPath) => {
    const value = resolvePath(data, varPath);
    return value != null ? String(value) : '';
  });
}

/**
 * Resolve a dotted or hash path in an object.
 * "session.checkpoint.iteration" → data.session.checkpoint.iteration
 * "session.checkpoint.plan_item_id" → data.session.checkpoint.plan_item_id
 */
function resolvePath(obj, varPath) {
  // Handle join: {{join array, sep}}
  if (varPath.startsWith('join ')) {
    const parts = varPath.slice(5).split(',').map((p) => p.trim());
    const arr = resolvePath(obj, parts[0]);
    if (Array.isArray(arr)) return arr.join(parts[1] || ', ');
    return '';
  }

  if (!obj) return undefined;
  if (typeof varPath !== 'string') return obj[varPath];

  // Handle hash paths like "for each item with priority=critical"
  // These are handled specially in the template
  if (varPath.includes(' with ')) {
    return undefined; // not a simple variable
  }

  const segments = varPath.split('.');
  let current = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

function isTruthy(value) {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

// ─── Markdown generation (no external template engine needed) ──────────────

/**
 * Generate test-plan.md from state, following the template structure
 * from test-plan-template.md exactly.
 */
function generateReport(state) {
  const lines = [];
  const project = state.project || {};
  const session = state.session || {};
  const plan = state.plan || { items: [], meta: {} };
  const mem = state.memory || { artifacts: [] };
  const testPlan = state.test_plan || {};

  // Header
  lines.push(`# Тестовый план: ${project.name || 'Unknown'}`);
  lines.push('');
  lines.push(
    `**Стек**: ${testPlan.target_stack || 'unknown'} | **Фреймворк**: ${testPlan.test_framework || 'unknown'}`
  );
  lines.push(
    `**Прогресс**: ${plan.meta.progress_percent ?? 0}% (${plan.meta.done ?? 0}/${plan.meta.total_items ?? 0})`
  );

  // Coverage summary
  const audit = testPlan.audit_summary || {};
  lines.push('');
  lines.push('## 📊 Сводка покрытия');
  lines.push('');
  lines.push('| Статус | Количество |');
  lines.push('|--------|------------|');
  lines.push(`| ✅ Полное | ${audit.full_coverage ?? 0} |`);
  lines.push(`| ⚠️ Частичное | ${audit.partial_coverage ?? 0} |`);
  lines.push(`| 🚫 Недействительное | ${audit.invalid_coverage ?? 0} |`);
  lines.push(`| ❌ Отсутствует | ${audit.no_coverage ?? 0} |`);

  // Priority summary
  lines.push('');
  lines.push('## 📋 Сводка задач');
  lines.push('');
  lines.push('| Приоритет | pending | in_progress | done | blocked |');
  lines.push('|-----------|---------|-------------|------|---------|');

  const byPriority = { critical: {}, high: {}, medium: {}, low: {} };
  for (const prio of ['critical', 'high', 'medium', 'low']) {
    for (const st of ['pending', 'in_progress', 'done', 'blocked']) {
      byPriority[prio][st] = 0;
    }
  }
  for (const item of plan.items) {
    if (byPriority[item.priority] && byPriority[item.priority][item.status] != null) {
      byPriority[item.priority][item.status]++;
    }
  }

  const prioLabels = { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' };
  for (const prio of ['critical', 'high', 'medium', 'low']) {
    const c = byPriority[prio];
    lines.push(`| ${prioLabels[prio]} | ${c.pending} | ${c.in_progress} | ${c.done} | ${c.blocked} |`);
  }

  // Tasks grouped by priority
  lines.push('');
  lines.push('## 🗂️ Задачи');

  for (const prio of ['critical', 'high', 'medium', 'low']) {
    const prioItems = plan.items.filter((i) => i.priority === prio);
    lines.push('');
    lines.push(`### ${prioLabels[prio]}`);
    lines.push('');

    if (prioItems.length === 0) {
      lines.push('_Нет задач_');
    } else {
      for (const item of prioItems) {
        const coverageStatus = item.coverage_status || '—';
        const subtype = item.subtype || '—';
        const targetStr = item.target || '';
        const sourceFiles = (item.files || []).length > 0
          ? (item.files || []).join(', ')
          : targetStr;
        const qualityGate =
          item.quality_gate && item.quality_gate.length > 0 ? item.quality_gate.join(', ') : 'не указан';
        const artifactFile = item.artifact ? `\`${item.artifact}\`` : '—';
        const resultStr = item.result
          ? `${item.result.status} – ${item.result.message}`
          : '—';

        lines.push(`### ${item.id}: ${item.name} [${item.status}]`);
        lines.push(`- **Тест**: ${subtype} | **Покрытие**: ${coverageStatus}`);
        lines.push(`- **Цель**: \`${sourceFiles || item.target || '—'}\``);
        lines.push(`- **Quality gate**: ${qualityGate}`);
        lines.push(`- **Тестовый файл**: ${artifactFile}`);
        lines.push(`- **Результат**: ${resultStr}`);
        lines.push('');
      }
    }
  }

  // Created test files
  lines.push('## 📁 Созданные тестовые файлы');
  lines.push('');
  if (mem.artifacts && mem.artifacts.length > 0) {
    for (const art of mem.artifacts) {
      lines.push(
        `- \`${art.path}\` — ${art.description}${art.related_plan_item ? ` (${art.related_plan_item})` : ''}`
      );
    }
  } else {
    lines.push('_Нет артефактов_');
  }

  // Current checkpoint
  lines.push('');
  lines.push('## 🔍 Текущий чекпоинт');
  lines.push('');
  const cp = session.checkpoint || {};
  lines.push(`- **Итерация**: ${cp.iteration ?? '—'}`);
  if (cp.plan_item_id) {
    lines.push(`- **Задача**: ${cp.plan_item_id} — ${cp.description || ''}`);
  } else {
    lines.push(`- **Задача**: Ожидание`);
  }

  // Footer
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*ИСТОЧНИК ИСТИНЫ: `agent-state.json`*');
  lines.push('*СХЕМА: `agent-state-schema.json`*');
  lines.push(`*Последнее обновление: ${session.last_updated || 'unknown'}*`);
  lines.push('');

  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const jsonPath = process.argv[2];

  if (!jsonPath) {
    console.log('Usage: node tools/generate-report.js <path-to-agent-state.json> [output-path]');
    console.log('  Generates test-plan.md from agent-state.json.');
    console.log('  If output-path is omitted, writes it alongside the input file.');
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

  const report = generateReport(state);

  // Determine output path
  let outputPath = process.argv[3];
  if (!outputPath) {
    // Write alongside the JSON: same directory, test-plan.md
    const inputDir = path.dirname(jsonPath);
    outputPath = path.join(inputDir, 'test-plan.md');
  }

  fs.writeFileSync(outputPath, report, 'utf-8');
  console.log(`Generated: ${outputPath}`);
  process.exit(0);
}

main();
