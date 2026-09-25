const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('BACKEND_CORA_GESTAO_APPS_SCRIPT.js', 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'BACKEND_CORA_GESTAO_APPS_SCRIPT.js' });

assert.strictEqual(context.sanitizeSheetValue_('texto comum'), 'texto comum');
assert.strictEqual(context.sanitizeSheetValue_('=AUDIT'), "'=AUDIT");
assert.strictEqual(context.sanitizeSheetValue_('+AUDIT'), "'+AUDIT");
assert.strictEqual(context.sanitizeSheetValue_('@AUDIT'), "'@AUDIT");

const validBudget = { 'Total orçamento': 599.999, 'Mensalidade/Parcela': '100.10' };
context.validateBudgetNumbers_(validBudget);
assert.strictEqual(validBudget['Total orçamento'], 600);
assert.strictEqual(validBudget['Mensalidade/Parcela'], 100.1);

assert.throws(() => context.validateBudgetNumbers_({ 'Total orçamento': -1 }), /Valor monetário inválido/);
assert.throws(() => context.validateBudgetNumbers_({ 'Total orçamento': 'NaN' }), /Valor monetário inválido/);
assert.throws(() => context.validateBudgetNumbers_({ 'Total orçamento': Infinity }), /Valor monetário inválido/);

const headers = ['ID','Responsável','Aluno','Total orçamento','PDF Drive','Contato do responsável'];
assert.strictEqual(context.requireExpectedSchema_('Orçamentos Cora Família', headers), true);
assert.throws(() => context.requireExpectedSchema_('Orçamentos Cora Família', ['ID','Responsável']), /Schema incompatível/);
assert.throws(() => context.requireExpectedSchema_('Orçamentos Cora Família', headers.concat(['ID'])), /Cabeçalhos duplicados/);

console.log('BACKEND_SECURITY_HELPERS=pass');
