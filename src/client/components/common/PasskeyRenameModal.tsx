import type { Result } from "@shared/type.js";
import { css, cx } from "hono/css";
import type { FC } from "hono/jsx";
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

const NAME_MAX_LENGTH = 60;

export const PasskeyRenameModal: FC<Props> = ({
  currentName,
  onSubmit,
  onCancel,
  defaultName,
  onReset,
}) => {
  const container = css`
    position: relative;
    padding: 22px 22px 18px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
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

  let isSubmitting = false;

  const handleInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const wrapper = input.closest<HTMLElement>("[data-rename-form]");
    const counter = wrapper?.querySelector<HTMLElement>("[data-char-count]");
    if (counter) counter.textContent = `${input.value.trim().length}/${NAME_MAX_LENGTH}`;
    const error = wrapper?.querySelector<HTMLElement>("[data-error-message]");
    if (error) error.textContent = "";
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget as HTMLFormElement;
    const wrapper = form.closest<HTMLElement>("[data-rename-form]") ?? form;
    const input = wrapper.querySelector<HTMLInputElement>("input[name=newName]");
    const error = wrapper.querySelector<HTMLElement>("[data-error-message]");
    const submitBtn = wrapper.querySelector<HTMLButtonElement>("[data-submit-btn]");

    const nextName = input?.value.trim() ?? "";

    if (!nextName) {
      if (error) error.textContent = "新しい名前を入力してください。";
      input?.focus();
      return;
    }

    if (nextName.length > NAME_MAX_LENGTH) {
      if (error) error.textContent = `名前は${NAME_MAX_LENGTH}文字以内で入力してください。`;
      input?.focus();
      return;
    }

    if (nextName === currentName) {
      if (error) error.textContent = "現在の名前と異なるものを指定してください。";
      input?.focus();
      return;
    }

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "変更中…";
    }

    const result = await onSubmit(nextName);

    if (!result.success) {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "保存する";
      }
      if (error) {
        error.textContent = result.error ?? "変更に失敗しました。";
      }
      input?.focus();
      return;
    }

    closeModal();
  };

  const handleReset = async () => {
    if (isSubmitting) return;
    const resetBtn = document.querySelector<HTMLButtonElement>("[data-reset-btn]");
    const submitBtn = document.querySelector<HTMLButtonElement>("[data-submit-btn]");
    const wrapper = resetBtn?.closest<HTMLElement>("[data-rename-form]");
    const error = wrapper?.querySelector<HTMLElement>("[data-error-message]");

    isSubmitting = true;
    if (resetBtn) resetBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    const result = await onReset();

    if (!result.success) {
      isSubmitting = false;
      if (resetBtn) resetBtn.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      if (error) error.textContent = result.error ?? "リセットに失敗しました。";
      return;
    }

    closeModal();
  };

  return (
    <form class={container} data-rename-form onSubmit={handleSubmit}>
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
          <span
            class={hint}
            data-char-count
          >{`${currentName.trim().length}/${NAME_MAX_LENGTH}`}</span>
        </div>
        <input
          id="new-passkey-name"
          type="text"
          name="newName"
          class={inputClass}
          value={currentName}
          maxlength={NAME_MAX_LENGTH}
          placeholder="例: iPhone 17 Pro / メインPC"
          onInput={handleInput}
          autocomplete="off"
        />
        <p class={errorClass} role="alert" aria-live="polite" data-error-message></p>
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
            data-reset-btn
            onClick={handleReset}
            title={`デフォルト名（${defaultName}）に戻す`}
          >
            デフォルトに戻す
          </button>
        </div>
        <button type="submit" class={buttonClass("primary", "md")} data-submit-btn>
          保存する
        </button>
      </div>
    </form>
  );
};
