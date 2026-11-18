import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import scopeWidgetCss from '../../scripts/scope-widget-css.mjs';

test('scopes variable initializers and animation names without touching keyframe steps', async () => {
  const result = await postcss([scopeWidgetCss()]).process(
    '* {--tw-x:0} .thing {animation:pulse 1s} @keyframes pulse {50% {opacity:.5}}',
    { from: undefined }
  );
  assert.match(result.css, /\[data-agichat-widget\] \*/);
  assert.match(result.css, /animation:agichat-pulse/);
  assert.match(result.css, /@keyframes agichat-pulse \{50%/);
});
test('the built SDK has no unscoped rule selectors or host body reset', () => {
  const css = readFileSync(new URL('../../dist-sdk/agichat-widget.css', import.meta.url), 'utf8');
  postcss.parse(css).walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    for (const selector of rule.selectors)
      assert.ok(selector.includes('[data-agichat-widget]'), selector);
  });
});
