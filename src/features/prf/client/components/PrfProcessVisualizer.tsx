import { css, cx, keyframes } from "hono/css";

export type ProcessStep = "idle" | "prf" | "derive" | "encrypt" | "decrypt" | "save" | "complete";

type Props = {
  step: ProcessStep;
  mode: "encrypt" | "decrypt";
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
`;

const containerClass = cx(
  css`
    padding: 16px;
    width: 100%;
    box-sizing: border-box;
    animation: ${fadeIn} 0.4s ease-out;
  `,
);

const stepListClass = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
  }
`;

const stepItemWrapperClass = css`
  display: contents;

  @media (max-width: 600px) {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
`;

const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
`;

const stepIconWrapperClass = css`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1;
  color: var(--color-text-subtle);
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const stepItemClass = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  min-width: 80px;
  z-index: 2;

  &.active ${stepIconWrapperClass} {
    border-color: var(--color-primary);
    color: var(--color-primary);
    animation: ${pulseAnimation} 2s infinite;
  }

  &.completed ${stepIconWrapperClass} {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #ffffff;
  }

  span.label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-subtle);
    transition: color 0.3s ease;
    text-align: center;
    white-space: nowrap;
  }

  &.active span.label,
  &.completed span.label {
    color: var(--color-text);
  }

  @media (max-width: 600px) {
    flex-direction: row;
    gap: 16px;
    min-width: auto;
    width: 100%;
    padding-bottom: 0;
    
    span.label {
      font-size: 14px;
      text-align: left;
    }
  }
`;

// Horizontal Line (Desktop)
const stepLineHorizontalClass = css`
  flex: 1;
  height: 2px;
  background: var(--color-border-strong);
  margin: 0 8px;
  margin-bottom: 20px; /* Align with icon center approx */
  position: relative;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 0%;
    background: var(--color-primary);
    transition: width 0.5s ease;
  }

  &.filled::after {
    width: 100%;
  }

  @media (max-width: 600px) {
    display: none;
  }
`;

// Vertical Line (Mobile)
const stepLineVerticalClass = css`
  display: none;
  width: 2px;
  height: 24px;
  background: var(--color-border-strong);
  margin-left: 21px; /* Center with 40px icon + 2px border (approx) */
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0%;
    background: var(--color-primary);
    transition: height 0.5s ease;
  }

  &.filled::after {
    height: 100%;
  }

  @media (max-width: 600px) {
    display: block;
  }
`;

const STEP_DEFINITIONS = {
  encrypt: [
    { id: "prf", label: "PRF評価", icon: "fingerprint" },
    { id: "derive", label: "鍵導出", icon: "vpn_key" },
    { id: "encrypt", label: "暗号化", icon: "lock" },
    { id: "save", label: "保存", icon: "cloud_upload" },
  ],
  decrypt: [
    { id: "prf", label: "PRF評価", icon: "fingerprint" },
    { id: "derive", label: "鍵導出", icon: "vpn_key" },
    { id: "decrypt", label: "復号", icon: "lock_open" },
  ],
} as const;

export const PrfProcessVisualizer = ({ step, mode }: Props) => {
  if (step === "idle") return null;

  const steps = STEP_DEFINITIONS[mode];
  const currentStepIndex =
    step === "complete" ? steps.length : steps.findIndex((s) => s.id === step);

  return (
    <div class={containerClass}>
      <h3 style="margin: 0 0 24px; text-align: center; font-size: 18px;">
        {mode === "encrypt" ? "暗号化プロセス" : "復号プロセス"}
      </h3>
      <ul class={stepListClass}>
        {steps.map((s, index) => {
          const isCompleted = currentStepIndex > index;
          const isActive = currentStepIndex === index;
          const isLast = index === steps.length - 1;

          let stateClass = "";
          if (isCompleted) stateClass = "completed";
          else if (isActive) stateClass = "active";

          return (
            <div key={s.id} class={stepItemWrapperClass}>
              <li class={cx(stepItemClass, stateClass)}>
                <div class={stepIconWrapperClass}>
                  <span class="material-symbols-outlined">{isCompleted ? "check" : s.icon}</span>
                </div>
                <span class="label">{s.label}</span>
              </li>
              {!isLast && (
                <>
                  <div class={cx(stepLineHorizontalClass, isCompleted && "filled")} />
                  <div class={cx(stepLineVerticalClass, isCompleted && "filled")} />
                </>
              )}
            </div>
          );
        })}
      </ul>
    </div>
  );
};
