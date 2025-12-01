import { css, cx } from "hono/css";
import { useEffect, useMemo, useState } from "hono/jsx/dom";
import {
  buttonClass,
  inputFieldClass,
  smallLabelClass,
  textMutedClass,
} from "../../../ui/theme.js";
import { PasskeyExplanationModal } from "../common/PasskeyExplanationModal.js";
import { openModal } from "../../lib/modal/base.js";
import { authClient } from "../../lib/rpc/authClient.js";
import { handleRegistration } from "../../lib/webauthn/registration.js";
import LoadingIndicator from "../common/LoadingIndicator.js";

const usernamePattern = /^[a-zA-Z0-9]+$/;

const hintText = cx(
  textMutedClass,
  smallLabelClass,
  css`
    text-align: center;
  `,
);

const container = css`
  margin-top: 24px;
  display: flex;
  justify-content: center;
`;

const formCard = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const row = css`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const counterText = cx(
  textMutedClass,
  css`
    font-size: 12px;
    min-width: 48px;
    text-align: right;
  `,
);

const errorText = css`
  color: var(--color-danger);
  font-size: 12px;
  min-height: 16px;
`;

const inputClass = cx(
  inputFieldClass,
  css`
    min-width: 220px;

    @media (max-width: 640px) {
      min-width: unset;
      width: 100%;
      box-sizing: border-box;
    }
  `,
);

const primaryButton = buttonClass("primary", "md");

const networkErrorMessage = "ネットワークエラーが発生しました。しばらくしてから再度お試しください。";

const getLocalValidationError = (value: string): string | null => {
  if (value.length === 0) return null;
  if (value.length > 64) {
    return "ユーザー名は1〜64文字で入力してください。";
  }
  if (!usernamePattern.test(value)) {
    return "ユーザー名は半角英数字のみ使用できます。";
  }
  return null;
};

export const AccountRegisterFormApp = () => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const trimmedUsername = useMemo(() => username.trim(), [username]);
  const charCount = trimmedUsername.length;

  useEffect(() => {
    let cancelled = false;
    if (trimmedUsername.length === 0) {
      setError("");
      setIsAvailable(false);
      setIsChecking(false);
      return () => {
        cancelled = true;
      };
    }
    const localError = getLocalValidationError(trimmedUsername);
    if (localError) {
      setError(localError);
      setIsAvailable(false);
      setIsChecking(false);
      return () => {
        cancelled = true;
      };
    }

    setIsChecking(true);
    setIsAvailable(false);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const res = await authClient["username-validate"].$post({
          json: { username: trimmedUsername },
        });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? networkErrorMessage);
          setIsAvailable(false);
          return;
        }
        setIsAvailable(true);
        setError("");
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(networkErrorMessage);
        setIsAvailable(false);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUsername]);

  const handleRegisterClick = () => {
    if (!trimmedUsername || !isAvailable || isChecking) {
      return;
    }

    openModal(
      <PasskeyExplanationModal
        onContinue={() => {
          void handleRegistration({
            isNewAccount: true,
            username: trimmedUsername,
          });
        }}
      />,
    );
  };

  return (
    <div class={container}>
      <div class={formCard}>
        <div id="username-hint" class={hintText}>
          ユーザー名は1〜64文字、半角英数字のみ。
        </div>
        <div class={row}>
          <input
            class={inputClass}
            type="text"
            name="username"
            id="username"
            placeholder="ユーザー名"
            pattern="[a-zA-Z0-9]{1,64}"
            title="1〜64文字、半角英数字のみ"
            aria-describedby="username-hint username-error"
            aria-invalid={error ? "true" : "false"}
            value={username}
            onInput={(event) => {
              const nextValue = (event.currentTarget as HTMLInputElement).value;
              setUsername(nextValue);
            }}
          />
          <span id="username-count" class={counterText} aria-live="polite">
            {charCount}/64
          </span>
          <button
            class={primaryButton}
            id="account-register-button"
            type="button"
            disabled={!isAvailable || isChecking}
            aria-disabled={!isAvailable || isChecking}
            onClick={handleRegisterClick}
          >
            {isChecking ? <LoadingIndicator inline={true} message=""/> : "登録"}
          </button>
        </div>
        <span id="username-error" class={errorText} role="alert" aria-live="polite">
          {error}
        </span>
      </div>
    </div>
  );
};
