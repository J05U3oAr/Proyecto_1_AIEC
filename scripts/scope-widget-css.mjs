/** Keep Tailwind's variable initializers and keyframes inside the embeddable SDK namespace. */
export default function scopeWidgetCss() {
  return {
    postcssPlugin: 'agichat-scope-sdk',
    OnceExit(root) {
      const names = new Map();
      root.walkAtRules(/keyframes$/, rule => {
        const previous = rule.params;
        const scoped = `agichat-${previous}`;
        names.set(previous, scoped);
        rule.params = scoped;
      });
      root.walkRules(rule => {
        if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
        rule.selectors = rule.selectors.map(selector =>
          selector.includes('[data-agichat-widget]')
            ? selector
            : `[data-agichat-widget] ${selector}`
        );
      });
      root.walkDecls(/^(animation|animation-name)$/, declaration => {
        for (const [previous, scoped] of names)
          declaration.value = declaration.value.replace(
            new RegExp(`\\b${previous}\\b`, 'g'),
            scoped
          );
      });
    },
  };
}
