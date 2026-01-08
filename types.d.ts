/**
 * Impression Design System Types
 * TypeScript definitions for extracted design systems and utilities
 *
 * @version 1.0.0
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export interface DesignSystem {
  meta: DesignSystemMeta;
  colors: ColorSystem;
  typography: TypographySystem;
  spacing: SpacingSystem;
  animations: AnimationSystem;
  components: ComponentSystem;
  shadows: Shadow[];
  borderRadius: BorderRadius[];
  breakpoints: BreakpointSystem;
  icons?: IconSystem;
  themes?: ThemeOverrides;
}

export interface DesignSystemMeta {
  url: string;
  title: string;
  extractedAt: string;
  viewport: Viewport;
  designCharacter: string;
  sources?: BlendSource[];
  blendStrategy?: 'merge' | 'prefer' | 'combine';
}

export interface Viewport {
  width: number;
  height: number;
}

export interface BlendSource {
  url: string;
  weight: number;
}

// =============================================================================
// COLOR TYPES
// =============================================================================

export interface ColorSystem {
  cssVariables: Record<string, string>;
  palette: ColorWithCount[];
  semantic: SemanticColors;
  gradients?: Gradient[];
}

export interface ColorWithCount {
  value: string;
  count?: number;
  role?: string;
  name?: string;
  source?: number;
}

export interface SemanticColors {
  backgrounds: ColorWithCount[];
  text: ColorWithCount[];
  borders: ColorWithCount[];
  accents: ColorWithCount[];
}

export interface Gradient {
  value: string;
  type: 'linear' | 'radial' | 'conic';
  stops?: GradientStop[];
}

export interface GradientStop {
  color: string;
  position: string;
}

// =============================================================================
// TYPOGRAPHY TYPES
// =============================================================================

export interface TypographySystem {
  fontFamilies: FontFamily[];
  scale: string[];
  fontWeights: string[];
  lineHeights: ValueWithCount[];
  letterSpacing: LetterSpacing[];
  pairings?: FontPairing[];
}

export interface FontFamily {
  family: string;
  weight: string;
  style: string;
  role: string;
  source?: string;
}

export interface ValueWithCount {
  value: string;
  count: number;
}

export interface LetterSpacing {
  value: string;
  count: number;
  note?: string;
}

export interface FontPairing {
  heading: string;
  body: string;
  type: 'contrast' | 'complement' | 'match';
}

// =============================================================================
// SPACING TYPES
// =============================================================================

export interface SpacingSystem {
  scale: string[];
  grid: string | null;
  gaps: ValueWithCount[];
  paddings: ValueWithCount[];
  margins?: ValueWithCount[];
}

// =============================================================================
// ANIMATION TYPES
// =============================================================================

export interface AnimationSystem {
  keyframes: Record<string, string>;
  transitions: TransitionValue[];
  durations: string[];
  easings: string[];
}

export interface TransitionValue {
  value: string;
  count: number;
}

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export interface ComponentSystem {
  buttons: ButtonComponent[];
  inputs: InputComponent[];
  cards: CardComponent[];
}

export interface ButtonComponent {
  variant: string;
  text: string;
  backgroundColor: string | null;
  textColor: string;
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: string;
  border?: string;
  boxShadow?: string;
}

export interface InputComponent {
  type: string;
  placeholder?: string;
  backgroundColor: string | null;
  textColor: string;
  borderRadius: string;
  padding: string;
  border: string;
  fontSize: string;
}

export interface CardComponent {
  backgroundColor: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  border?: string;
}

// =============================================================================
// EFFECTS TYPES
// =============================================================================

export interface Shadow {
  value: string;
  count?: number;
  role?: string;
}

export interface BorderRadius {
  value: string;
  count?: number;
  role?: string;
}

// =============================================================================
// BREAKPOINT TYPES
// =============================================================================

export interface BreakpointSystem {
  detected: number[];
  containerWidths: number[];
}

// =============================================================================
// ICON TYPES
// =============================================================================

export interface IconSystem {
  library: string | null;
  note?: string;
}

// =============================================================================
// THEME TYPES
// =============================================================================

export interface ThemeOverrides {
  dark?: Partial<ColorSystem>;
  light?: Partial<ColorSystem>;
}

// =============================================================================
// COMPARISON TYPES
// =============================================================================

export interface ComparisonResult {
  score: number;
  issues: ComparisonIssue[];
  summary: ComparisonSummary;
  accessibility?: AccessibilityReport;
}

export interface ComparisonIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  expected?: string;
  actual?: string;
}

export interface ComparisonSummary {
  colors: CategoryStats;
  typography: CategoryStats;
  spacing: CategoryStats;
  shadows?: CategoryStats;
  borderRadius?: CategoryStats;
}

export interface CategoryStats {
  matched: number;
  missing: number;
  extra?: number;
}

export interface AccessibilityReport {
  passed: ContrastResult[];
  failed: ContrastResult[];
  score: number;
}

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  level: 'AAA' | 'AA' | 'AA-large' | 'fail';
}

// =============================================================================
// IMPLEMENTATION PLAN TYPES
// =============================================================================

export interface ImplementationPlan {
  meta: PlanMeta;
  changes: ImplementationChange[];
  summary: PlanSummary;
}

export interface PlanMeta {
  projectPath: string;
  referenceUrl: string;
  generatedAt: string;
  branchName: string;
}

export interface ImplementationChange {
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  category: string;
  description: string;
  files: string[];
  tokens?: Record<string, string>;
}

export interface PlanSummary {
  totalChanges: number;
  byPriority: Record<string, number>;
  estimatedFiles: number;
}

// =============================================================================
// TOKEN FORMAT TYPES
// =============================================================================

export interface W3CTokens {
  $schema?: string;
  [key: string]: W3CTokenGroup | W3CToken | string | undefined;
}

export interface W3CTokenGroup {
  [key: string]: W3CToken | W3CTokenGroup;
}

export interface W3CToken {
  $type: W3CTokenType;
  $value: unknown;
  $description?: string;
}

export type W3CTokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'shadow'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'gradient';

export interface StyleDictionaryTokens {
  [category: string]: {
    [name: string]: StyleDictionaryToken;
  };
}

export interface StyleDictionaryToken {
  value: string | number;
  type?: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

export interface FigmaTokens {
  [category: string]: {
    [name: string]: FigmaToken;
  };
}

export interface FigmaToken {
  $type: string;
  $value: string | number | FigmaColor | FigmaShadow;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaShadow {
  color: FigmaColor;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread?: string;
}

export interface ShadcnTheme {
  cssVariables: Record<string, string>;
  note?: string;
}

// =============================================================================
// TAILWIND CONFIG TYPES
// =============================================================================

export interface TailwindConfig {
  content?: string[];
  theme?: TailwindTheme;
  plugins?: unknown[];
}

export interface TailwindTheme {
  extend?: TailwindThemeExtend;
  colors?: Record<string, string | Record<string, string>>;
  fontFamily?: Record<string, string[]>;
  fontSize?: Record<string, string | [string, string | Record<string, string>]>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  boxShadow?: Record<string, string>;
}

export interface TailwindThemeExtend {
  colors?: Record<string, string | Record<string, string>>;
  fontFamily?: Record<string, string[]>;
  fontSize?: Record<string, string | [string, string | Record<string, string>]>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  boxShadow?: Record<string, string>;
  keyframes?: Record<string, Record<string, Record<string, string>>>;
  animation?: Record<string, string>;
}

// =============================================================================
// SCREENSHOT TYPES
// =============================================================================

export interface ScreenshotManifest {
  url: string;
  timestamp: string;
  breakpoints: BreakpointScreenshots[];
  pages: PageScreenshots[];
  elements: ElementScreenshots[];
  instructions: ScreenshotInstruction[];
}

export interface BreakpointScreenshots {
  name: string;
  width: number;
  height: number;
  screenshots: string[];
}

export interface PageScreenshots {
  name: string;
  path: string;
}

export interface ElementScreenshots {
  name: string;
  selector: string;
}

export interface ScreenshotInstruction {
  type: 'viewport' | 'fullPage' | 'element';
  breakpoint: string;
  page: string;
  url: string;
  resize: Viewport;
  filename: string;
  element?: string;
  selector?: string;
}

export interface CapturePlan {
  manifest: ScreenshotManifest;
  commands: PlaywrightCommand[];
  outputDir: string;
  summary: CaptureSummary;
}

export interface PlaywrightCommand {
  tool: string;
  params: Record<string, unknown>;
  comment: string;
  selector?: string;
  fallback?: boolean;
}

export interface CaptureSummary {
  url: string;
  timestamp: string;
  breakpoints: number;
  pages: number;
  elements: number;
  totalScreenshots: number;
}

// =============================================================================
// CI TYPES
// =============================================================================

export interface CIReport {
  version: string;
  timestamp: string;
  project: string;
  reference: string;
  score: number;
  passed: boolean;
  summary: ComparisonSummary;
  issues: ComparisonIssue[];
  thresholds: CIThresholds;
}

export interface CIThresholds {
  colorDelta: number;
  contrastMinimum: number;
  fontSimilarity: number;
  spacingTolerance: number;
  overallScore: number;
}

export interface CIResult {
  result: ComparisonResult;
  report: string;
  exitCode: 0 | 1 | 2;
  passed: boolean;
}

// =============================================================================
// BLEND TYPES
// =============================================================================

export interface BlendOptions {
  weights?: number[];
  strategy?: 'merge' | 'prefer' | 'combine';
  dedupeThreshold?: number;
}

export interface MergeOptions {
  dedupe?: boolean;
  maxItems?: number;
  sortBy?: 'count' | 'name' | 'value';
  preferFirst?: boolean;
}

// =============================================================================
// MIGRATION TYPES
// =============================================================================

export type TokenFormat =
  | 'impression'
  | 'w3c'
  | 'sd'
  | 'style-dictionary'
  | 'figma'
  | 'tokens-studio'
  | 'tailwind'
  | 'css'
  | 'shadcn';

export interface InternalTokens {
  colors: {
    variables: Record<string, string>;
    palette: ColorWithCount[];
    semantic: SemanticColors;
  };
  typography: {
    families: FontFamily[];
    scale: string[];
    weights: string[];
    lineHeights: ValueWithCount[];
  };
  spacing: {
    scale: string[];
    grid?: string | null;
  };
  shadows: Shadow[];
  borderRadius: BorderRadius[];
  animations: Partial<AnimationSystem>;
  breakpoints: Partial<BreakpointSystem>;
  meta: Partial<DesignSystemMeta>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface LAB {
  L: number;
  a: number;
  b: number;
}

// =============================================================================
// MODULE DECLARATIONS
// =============================================================================

declare module 'impression/extract-design-system' {
  export function extractDesignSystem(): DesignSystem;
}

declare module 'impression/compare-design-systems' {
  export function runComparison(
    projectPath: string,
    reference: DesignSystem,
    thresholds?: Partial<CIThresholds>
  ): ComparisonResult;

  export function deltaE2000(lab1: LAB, lab2: LAB): number;
  export function getContrastRatio(fg: string, bg: string): number;
  export function hexToLab(hex: string): LAB;
}

declare module 'impression/implement-design-changes' {
  export function generateImplementationPlan(
    projectPath: string,
    reference: DesignSystem
  ): ImplementationPlan;

  export function executePlan(
    plan: ImplementationPlan,
    options?: { dryRun?: boolean }
  ): void;
}

declare module 'impression/generate-tailwind-config' {
  export function generateTailwindConfig(
    designSystem: DesignSystem
  ): string;
}

declare module 'impression/generate-css-variables' {
  export function generateCSSVariables(
    designSystem: DesignSystem,
    options?: { scope?: string }
  ): string;
}

declare module 'impression/generate-figma-tokens' {
  export function generateFigmaTokens(
    designSystem: DesignSystem
  ): FigmaTokens;
}

declare module 'impression/generate-shadcn-theme' {
  export function generateShadcnTheme(
    designSystem: DesignSystem
  ): ShadcnTheme;
}

declare module 'impression/generate-w3c-tokens' {
  export function generateW3CTokens(
    designSystem: DesignSystem
  ): W3CTokens;
}

declare module 'impression/blend-design-systems' {
  export function blendDesignSystems(
    systems: DesignSystem[],
    options?: BlendOptions
  ): DesignSystem;

  export function blendColors(
    color1: string,
    color2: string,
    weight1?: number
  ): string;

  export function colorDistance(
    color1: string,
    color2: string
  ): number;
}

declare module 'impression/migrate-tokens' {
  export function migrateTokens(
    input: unknown,
    fromFormat: TokenFormat | null,
    toFormat: TokenFormat
  ): unknown;

  export function detectFormat(data: unknown): TokenFormat | null;
}

declare module 'impression/capture-screenshots' {
  export function generateCapturePlan(
    url: string,
    options?: {
      outputDir?: string;
      label?: string;
      breakpoints?: BreakpointScreenshots[];
      pages?: PageScreenshots[];
      elements?: ElementScreenshots[];
    }
  ): CapturePlan;

  export function generateComparisonReport(
    beforeDir: string,
    afterDir: string,
    options?: { title?: string; outputPath?: string }
  ): { html: string; pairs: unknown[]; stats: unknown };
}

declare module 'impression/ci-compare' {
  export function runCIComparison(
    projectPath: string,
    referencePath: string,
    options?: {
      threshold?: number;
      format?: 'text' | 'json' | 'github' | 'gitlab' | 'markdown';
      failOn?: 'critical' | 'major' | 'warning';
      thresholds?: Partial<CIThresholds>;
    }
  ): CIResult;
}
