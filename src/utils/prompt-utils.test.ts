import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTurkishText,
  filterPrompts,
  extractTemplateVariables,
  fillPromptTemplate,
  formatVariableLabel,
  hasFillableVariables,
  sanitizeTags,
  estimateStats,
  type FilterablePrompt,
} from './prompt-utils';

test('normalizeTurkishText handles Turkish characters and casing correctly', () => {
  assert.equal(normalizeTurkishText('İstanbul'), 'istanbul');
  assert.equal(normalizeTurkishText('IĞDIR'), 'igdir');
  assert.equal(normalizeTurkishText('Şeker Çörek Üzüm'), 'seker corek uzum');
  assert.equal(normalizeTurkishText('   Örnek Prompt   '), 'ornek prompt');
});

test('extractTemplateVariables extracts both {var}, {{var}} and [VAR] formats', () => {
  const content = 'Lütfen {topic} konusunu incele, {{hedef_kitle}} için [FRAMEWORK] kullanarak bir kod yaz.';
  const vars = extractTemplateVariables(content);
  assert.deepEqual(vars, ['topic', 'hedef_kitle', 'FRAMEWORK']);
});

test('formatVariableLabel formats technical variable names to clear Turkish labels', () => {
  assert.equal(formatVariableLabel('text_to_summarize'), 'Özetlenecek Metin');
  assert.equal(formatVariableLabel('concept'), 'Kavram / Konu Başlığı');
  assert.equal(formatVariableLabel('custom_variable_name'), 'Custom Variable Name');
  assert.equal(formatVariableLabel('proje_adi'), 'Proje veya Ürün Adı');
});

test('fillPromptTemplate replaces both single and double curly variables', () => {
  const content = 'Explain {concept} in simple terms for {{audience}}.';
  const filled = fillPromptTemplate(content, {
    concept: 'Quantum Computing',
    audience: 'High School Students',
  });
  assert.equal(filled, 'Explain Quantum Computing in simple terms for High School Students.');
});

test('filterPrompts supports onlyFillable filter to find prompts with variables', () => {
  const samplePrompts: FilterablePrompt[] = [
    {
      id: '1',
      title: 'Prompt With Variables',
      description: 'Has fields',
      content: 'Summarize {text_to_summarize} in {number} bullets.',
      category: 'Genel',
      tags: ['ozet'],
      is_favorite: false,
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    },
    {
      id: '2',
      title: 'Static Prompt',
      description: 'No variables',
      content: 'You are a general assistant. Always be polite.',
      category: 'Genel',
      tags: ['asistan'],
      is_favorite: false,
      created_at: '2026-01-02T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
    },
  ];

  const fillableOnly = filterPrompts(samplePrompts, { onlyFillable: true });
  assert.equal(fillableOnly.length, 1);
  assert.equal(fillableOnly[0].id, '1');
});

test('sanitizeTags cleans comma/space separated tags and removes hashtags', () => {
  assert.deepEqual(sanitizeTags('#kodlama, #react, nextjs'), ['kodlama', 'react', 'nextjs']);
});

test('estimateStats calculates words, chars and estimated tokens', () => {
  const stats = estimateStats('Merhaba dünya, bu bir prompt denemesidir.');
  assert.equal(stats.words, 6);
  assert.ok(stats.chars > 0);
  assert.ok(stats.estTokens > 0);
});
