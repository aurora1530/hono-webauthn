import { css, cx } from "hono/css";

export const tokens = {
  color: {
    primary: "#0031d8", // Blue 800
    primaryStrong: "#0017c1", // Blue 900
    surface: "#ffffff", // White
    surfaceMuted: "#f2f2f2", // Gray 50
    surfaceStrong: "#e6e6e6", // Gray 100
    border: "#e6e6e6", // Gray 100
    borderStrong: "#cccccc", // Gray 200
    text: "#1a1a1a", // Gray 900
    textSubtle: "#666666", // Gray 600
    bg: "#f2f2f2", // Gray 50
    danger: "#ec0000", // Red 800
    dangerSurface: "#fdeeee", // Red 50
    warningBorder: "#b78f00", // Yellow 700
    success: "#259d63", // Green 600
    successSurface: "#e6f5ec", // Green 50
    warning: "#b78f00", // Yellow 700
    warningSurface: "#fbf5e0", // Yellow 50
    infoSurface: "#e8f1fe", // Blue 50
    codeBg: "#1a1a1a", // Gray 900
    codeText: "#f2f2f2", // Gray 50
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    pill: "999px",
  },
  shadow: {
    sm: "0 4px 14px rgba(26, 26, 26, 0.08)",
    md: "0 10px 30px rgba(26, 26, 26, 0.12)",
  },
  font: {
    body: "Inter, 'Noto Sans JP', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
};

export const darkTokens = {
  color: {
    primary: "#4979f5", // Blue 500
    primaryStrong: "#7096f8", // Blue 400
    surface: "#333333", // Gray 800
    surfaceMuted: "#4d4d4d", // Gray 700
    surfaceStrong: "#1a1a1a", // Gray 900
    border: "#4d4d4d", // Gray 700
    borderStrong: "#666666", // Gray 600
    text: "#f2f2f2", // Gray 50
    textSubtle: "#999999", // Gray 400
    bg: "#1a1a1a", // Gray 900
    danger: "#ff7171", // Red 400
    dangerSurface: "#620000", // Red 1200
    warningBorder: "#d2a400", // Yellow 600
    success: "#51b883", // Green 400
    successSurface: "#032213", // Green 1200
    warning: "#ffc700", // Yellow 400
    warningSurface: "#604b00", // Yellow 1200
    infoSurface: "#000060", // Blue 1200
    codeBg: "#000000", // Black
    codeText: "#f2f2f2", // Gray 50
  },
  shadow: {
    sm: "0 4px 14px rgba(0, 0, 0, 0.2)",
    md: "0 10px 30px rgba(0, 0, 0, 0.4)",
  },
};

export const themeClass = css`
  --color-primary: ${tokens.color.primary};
  --primary-color: var(--color-primary);
  --primary-hover: ${tokens.color.primaryStrong};
  --color-bg: ${tokens.color.bg};
  --bg-color: var(--color-bg);
  --color-surface: ${tokens.color.surface};
  --header-bg: var(--color-surface);
  --color-surface-muted: ${tokens.color.surfaceMuted};
  --color-surface-strong: ${tokens.color.surfaceStrong};
  --color-border: ${tokens.color.border};
  --border-color: var(--color-border);
  --color-border-strong: ${tokens.color.borderStrong};
  --color-text: ${tokens.color.text};
  --text-color: var(--color-text);
  --color-text-subtle: ${tokens.color.textSubtle};
  --color-danger: ${tokens.color.danger};
  --color-danger-surface: ${tokens.color.dangerSurface};
  --color-success: ${tokens.color.success};
  --color-success-surface: ${tokens.color.successSurface};
  --color-warning: ${tokens.color.warning};
  --color-warning-surface: ${tokens.color.warningSurface};
  --color-info-surface: ${tokens.color.infoSurface};
  --color-code-bg: ${tokens.color.codeBg};
  --color-code-text: ${tokens.color.codeText};
  --shadow-sm: ${tokens.shadow.sm};
  --shadow-md: ${tokens.shadow.md};
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-pill: ${tokens.radius.pill};
  --font-body: ${tokens.font.body};
  --font-mono: ${tokens.font.mono};
  --icon-light-display: block;
  --icon-dark-display: none;
  color: var(--color-text);
  background: var(--color-bg);
  font-family: var(--font-body);

  &.dark {
    color-scheme: dark;
    --color-primary: ${darkTokens.color.primary};
    --primary-hover: ${darkTokens.color.primaryStrong};
    --color-bg: ${darkTokens.color.bg};
    --color-surface: ${darkTokens.color.surface};
    --color-surface-muted: ${darkTokens.color.surfaceMuted};
    --color-surface-strong: ${darkTokens.color.surfaceStrong};
    --color-border: ${darkTokens.color.border};
    --color-border-strong: ${darkTokens.color.borderStrong};
    --color-text: ${darkTokens.color.text};
    --color-text-subtle: ${darkTokens.color.textSubtle};
    --color-danger: ${darkTokens.color.danger};
    --color-danger-surface: ${darkTokens.color.dangerSurface};
    --color-success: ${darkTokens.color.success};
    --color-success-surface: ${darkTokens.color.successSurface};
    --color-warning: ${darkTokens.color.warning};
    --color-warning-surface: ${darkTokens.color.warningSurface};
    --color-info-surface: ${darkTokens.color.infoSurface};
    --color-code-bg: ${darkTokens.color.codeBg};
    --color-code-text: ${darkTokens.color.codeText};
    --shadow-sm: ${darkTokens.shadow.sm};
    --shadow-md: ${darkTokens.shadow.md};
    --icon-light-display: none;
    --icon-dark-display: block;
  }
`;

export const bodyClass = css`
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
`;

export const mainContainerClass = css`
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${tokens.spacing.xl};
  box-sizing: border-box;
`;

export const textMutedClass = css`
  color: var(--color-text-subtle);
`;

export const sectionStackClass = css`
  display: grid;
  gap: ${tokens.spacing.lg};
`;

export const pageTitleClass = css`
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 ${tokens.spacing.sm};
`;

export const surfaceBaseClass = css`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: ${tokens.spacing.xl};
`;

const surfaceTone = {
  default: css``,
  muted: css`
    background: var(--color-surface-muted);
    border-color: var(--color-border-strong);
  `,
  danger: css`
    background: var(--color-danger-surface);
    border-color: color-mix(in srgb, var(--color-danger) 35%, white);
  `,
};

export type SurfaceTone = keyof typeof surfaceTone;

export const surfaceClass = (tone: SurfaceTone = "default") =>
  cx(surfaceBaseClass, surfaceTone[tone]);

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease,
    box-shadow 0.2s ease, transform 0.08s ease;
  text-decoration: none;
`;

const buttonSize = {
  sm: css`
    padding: 7px 12px;
    font-size: 14px;
  `,
  md: css`
    padding: 10px 16px;
    font-size: 15px;
  `,
  lg: css`
    padding: 12px 18px;
    font-size: 16px;
  `,
};

const buttonVariant = {
  primary: css`
    background: var(--color-primary);
    color: #ffffff;
    border-color: var(--color-primary);
    box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 25%, transparent);
    &:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }
    &:active {
      transform: translateY(1px);
    }
    &:disabled {
      background: color-mix(in srgb, var(--color-primary) 45%, white);
      border-color: color-mix(in srgb, var(--color-primary) 45%, white);
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.85;
    }
  `,
  secondary: css`
    background: var(--color-surface-strong);
    color: var(--color-text);
    border-color: var(--color-border);
    &:hover {
      background: color-mix(in srgb, var(--color-surface-strong) 70%, white);
      border-color: var(--color-border-strong);
    }
    &:active {
      transform: translateY(1px);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--color-text);
    border-color: var(--color-border);
    &:hover {
      background: color-mix(in srgb, var(--color-surface-muted) 70%, white);
    }
    &:active {
      transform: translateY(1px);
    }
  `,
  danger: css`
    background: var(--color-danger);
    color: #ffffff;
    border-color: var(--color-danger);
    &:hover {
      background: color-mix(in srgb, var(--color-danger) 85%, black);
      border-color: color-mix(in srgb, var(--color-danger) 85%, black);
    }
    &:active {
      transform: translateY(1px);
    }
    &:disabled {
      background: color-mix(in srgb, var(--color-danger) 35%, white);
      border-color: color-mix(in srgb, var(--color-danger) 35%, white);
      cursor: not-allowed;
    }
  `,
};

const fullWidthClass = css`
  width: 100%;
`;

export type ButtonVariant = keyof typeof buttonVariant;
export type ButtonSize = keyof typeof buttonSize;

export const buttonClass = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  opts?: { fullWidth?: boolean },
) => cx(buttonBase, buttonSize[size], buttonVariant[variant], opts?.fullWidth && fullWidthClass);

export const pillClass = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-strong);
  color: var(--color-text);
  font-weight: 600;
  border: 1px solid var(--color-border);
`;

const badgeBase = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-weight: 700;
  font-size: 13px;
  line-height: 1.2;
  width: fit-content;
`;

const badgeVariant = {
  neutral: css`
    background: var(--color-surface-strong);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  `,
  warning: css`
    background: var(--color-warning-surface);
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
  `,
  danger: css`
    background: var(--color-danger-surface);
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 55%, white);
  `,
};

export type BadgeVariant = keyof typeof badgeVariant;

export const badgeClass = (variant: BadgeVariant = "neutral") =>
  cx(badgeBase, badgeVariant[variant]);

export const inputFieldClass = css`
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }
  &:disabled {
    background: var(--color-surface-muted);
    color: var(--color-text-subtle);
    cursor: not-allowed;
  }
`;

export const navLinkClass = css`
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
  padding: 6px 0;
  transition: color 0.2s ease;
  &:hover {
    color: var(--color-primary);
  }
`;

export const subtleLinkClass = css`
  color: var(--color-text-subtle);
  text-decoration: none;
  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`;

export const smallLabelClass = css`
  font-size: 13px;
  color: var(--color-text-subtle);
`;

export const activeMenuLinkClass = css`
  color: var(--color-text-subtle);
  cursor: default;
  pointer-events: none;
  &:hover {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text-subtle);
  }
`;
