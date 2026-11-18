import { describe, expect, it } from 'vitest';
import { resolveWidgetTheme } from '@/sdk/theme';

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map(channel => parseInt(channel, 16) / 255)
    .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const pair = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (pair[0] + 0.05) / (pair[1] + 0.05);
}
describe('default theme contrast', () => {
  it.each(['light', 'dark'] as const)(
    '%s meets text and control contrast on its surfaces',
    theme => {
      const { colors } = resolveWidgetTheme(theme);
      for (const surface of [colors.surface, colors.surfaceMuted]) {
        expect(contrast(colors.text, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.textMuted, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.border, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(colors.primary, colors.primaryContrast)).toBeGreaterThanOrEqual(4.5);
    }
  );
  it('preserves integrator color overrides without changing their brand', () => {
    expect(resolveWidgetTheme({ primary: '#123456', text: '#111111' }).colors).toMatchObject({
      primary: '#123456',
      text: '#111111',
      surface: '#ffffff',
    });
  });
});
