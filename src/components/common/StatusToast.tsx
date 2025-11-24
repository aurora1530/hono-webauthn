import { css } from "hono/css";
import type { FC } from "hono/jsx";

const popoverShellClass = css`
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  position: fixed;
  inset: 0;
  display: block;
  pointer-events: none;
`;

const StatusToast: FC = () => {
  return <div id="status-toast-root" popover="manual" class={popoverShellClass} />;
};

export default StatusToast;
