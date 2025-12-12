import { MAX_PASSKEY_NAME_LENGTH } from "@shared/constant.js";
import type { Result } from "@shared/type.js";
import { css, cx } from "hono/css";
import { type FC, useRef, useState } from "hono/jsx";
import { buttonClass, inputFieldClass, textMutedClass } from "../../../ui/theme.js";
import { closeModal } from "../../lib/modal/base.js";

type SubmitResult = Result<never, string>;

type Props = {
  currentName: string;
  onSubmit: (newName: string) => Promise<SubmitResult>;
  onCancel?: () => void;
  defaultName: string;
  onReset: () => Promise<SubmitResult>;
};

export const PasskeyRenameModal: FC<Props> = ({
  currentName,
  onSubmit,
  onCancel,
  defaultName,
  onReset,
}) => {
  const inputElement = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [errMsg, setErrMsg] = useState("");

  const container = css`
    position: relative;
    padding: 22px 22px 18px;
    display: grid;
    gap: 14px;
  `;

  const accentBar = css`
    width: 68px;
    height: 6px;
    border-radius: 999px;
    background: var(--color-primary);
  `;

  const titleRow = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `;

  const title = css`
    margin: 0;
    font-size: 18px;
    font-weight: 750;
  `;

  const badge = css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-pill);
    background: var(--color-surface-muted);
    border: 1px solid var(--color-border);
    font-weight: 650;
    font-size: 13px;
  `;

  const inputWrap = css`
    display: grid;
    gap: 8px;
  `;

  const inputClass = cx(
    inputFieldClass,
    css`
      width: 100%;
      box-sizing: border-box;
    `,
  );

  const labelRow = css`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  `;

  const hint = cx(
    textMutedClass,
    css`
      font-size: 13px;
    `,
  );

  const errorClass = css`
    color: var(--color-danger);
    font-size: 13px;
    min-height: 18px;
  `;

  const actions = css`
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  `;

  const handleInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    setErrMsg("");
    setNewName(input.value);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newName.trim()) {
      setErrMsg("新しい名前を入力してください。");
      inputElement.current?.focus();
      return;
    }

    if (newName.length > MAX_PASSKEY_NAME_LENGTH) {
      setErrMsg(`名前は${MAX_PASSKEY_NAME_LENGTH}文字以内で入力してください。`);
      inputElement.current?.focus();
      return;
    }

    if (newName === currentName) {
      setErrMsg("現在の名前と異なるものを指定してください。");
      inputElement.current?.focus();
      return;
    }

    setIsSubmitting(true);

    const result = await onSubmit(newName);

    if (!result.success) {
      setIsSubmitting(false);
      setErrMsg(result.error ?? "変更に失敗しました。");
      inputElement.current?.focus();
      return;
    }

    closeModal();
  };

  const handleReset = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const result = await onReset();

    if (!result.success) {
      setIsSubmitting(false);
      setErrMsg(result.error ?? "リセットに失敗しました。");
      return;
    }

    closeModal();
  };

  return (
    <form class={container} onSubmit={handleSubmit}>
      <span class={accentBar} aria-hidden="true"></span>
      <div class={titleRow}>
        <h3 class={title}>パスキー名を変更</h3>
        <span class={badge} title="現在の名前">
          {currentName}
        </span>
      </div>

      <p class={hint}>
        デバイスやブラウザに表示されるラベルです。あとで見返したときに識別しやすい名前をつけてください。
      </p>

      <div class={inputWrap}>
        <div class={labelRow}>
          <label for="new-passkey-name">新しい名前</label>
          <span class={hint}>{`${newName.trim().length}/${MAX_PASSKEY_NAME_LENGTH}`}</span>
        </div>
        <input
          id="new-passkey-name"
          type="text"
          name="newName"
          class={inputClass}
          value={newName}
          maxlength={MAX_PASSKEY_NAME_LENGTH}
          placeholder="例: iPhone 17 Pro / メインPC"
          onInput={handleInput}
          autocomplete="off"
          ref={inputElement}
        />
        <p class={errorClass} role="alert" aria-live="polite">
          {errMsg}
        </p>
      </div>

      <div class={actions}>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button
            type="button"
            class={buttonClass("ghost", "md")}
            onClick={() => {
              onCancel?.();
              closeModal();
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            class={buttonClass("secondary", "md")}
            onClick={handleReset}
            title={`デフォルト名（${defaultName}）に戻す`}
            disabled={newName.trim() === defaultName.trim() || isSubmitting}
          >
            デフォルトに戻す
          </button>
        </div>
        <button
          type="submit"
          class={buttonClass("primary", "md")}
          disabled={newName.trim() === currentName.trim() || isSubmitting}
        >
          {isSubmitting ? "変更中…" : "保存する"}
        </button>
      </div>
    </form>
  );
};
