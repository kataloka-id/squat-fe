export const DEFAULT_COMPANY_BRAND = '#8a00d6';
export const COMPANY_BRAND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

type Rgb = { red: number; green: number; blue: number };
export type CompanyBrandShade = (typeof COMPANY_BRAND_SHADES)[number];
export type CompanyBrandTokens = Record<CompanyBrandShade, string>;

const hexColour = /^#[0-9a-fA-F]{6}$/;

const parseHex = (value: string): Rgb => ({
  red: Number.parseInt(value.slice(1, 3), 16),
  green: Number.parseInt(value.slice(3, 5), 16),
  blue: Number.parseInt(value.slice(5, 7), 16),
});

const mix = (source: Rgb, target: Rgb, amount: number): Rgb => ({
  red: Math.round(source.red + (target.red - source.red) * amount),
  green: Math.round(source.green + (target.green - source.green) * amount),
  blue: Math.round(source.blue + (target.blue - source.blue) * amount),
});

const luminanceChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

export const contrastRatio = (foreground: Rgb, background: Rgb): number => {
  const luminance = (colour: Rgb) =>
    0.2126 * luminanceChannel(colour.red) +
    0.7152 * luminanceChannel(colour.green) +
    0.0722 * luminanceChannel(colour.blue);
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
};

const toChannels = (colour: Rgb) => `${colour.red} ${colour.green} ${colour.blue}`;

const safeBase = (colour: Rgb): Rgb => {
  let candidate = colour;
  while (contrastRatio({ red: 255, green: 255, blue: 255 }, candidate) < 4.5)
    candidate = mix(candidate, { red: 0, green: 0, blue: 0 }, 0.08);
  return candidate;
};

export const resolveCompanyBrandColour = (colour: string | null | undefined): string =>
  hexColour.test(colour ?? '') ? colour! : DEFAULT_COMPANY_BRAND;

export const getCompanyBrandTokens = (colour: string | null | undefined): CompanyBrandTokens => {
  const base = safeBase(parseHex(resolveCompanyBrandColour(colour)));
  const white = { red: 255, green: 255, blue: 255 };
  const black = { red: 0, green: 0, blue: 0 };
  const values: Record<CompanyBrandShade, Rgb> = {
    50: mix(base, white, 0.96),
    100: mix(base, white, 0.9),
    200: mix(base, white, 0.78),
    300: mix(base, white, 0.62),
    400: mix(base, white, 0.35),
    500: base,
    600: mix(base, black, 0.1),
    700: mix(base, black, 0.22),
    800: mix(base, black, 0.36),
    900: mix(base, black, 0.5),
    950: mix(base, black, 0.7),
  };
  return Object.fromEntries(
    COMPANY_BRAND_SHADES.map((shade) => [shade, toChannels(values[shade])]),
  ) as CompanyBrandTokens;
};
