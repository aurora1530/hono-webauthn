import type { Child } from "hono/jsx";
import { render } from "hono/jsx/dom";

function closeModal() {
  const modal = document.getElementById("main-modal") as HTMLDialogElement | null;
  const modalContent = document.getElementById("main-modal-content");
  if (modal) {
    // closeModal呼び出し時は、ここで内容をクリアする。これにより、overwriteイベントと、正常にcloseされた場合とで区別できる。
    if (modalContent) modalContent.innerHTML = "";
    modal.close();
  }
}

export type ModalEventHandlers = {
  onClose?: () => void;
  onOverwrite?: () => void;
};

function openModalWithJSX(content: Child, handlers?: ModalEventHandlers) {
  const modal = document.getElementById("main-modal") as HTMLDialogElement | null;
  const modalContent = document.getElementById("main-modal-content");
  if (modal && modalContent) {
    // 別のモーダルが存在する場合、overwriteイベントを発火させる。
    if (modalContent.firstChild) {
      const overwriteEvent = new Event("overwrite");
      modalContent.firstChild.dispatchEvent(overwriteEvent);
    }

    render(content, modalContent);

    // イベントハンドラを登録する
    if (handlers?.onOverwrite) {
      const overwriteHandler = () => {
        handlers.onOverwrite!();
        modalContent.firstChild?.removeEventListener("overwrite", overwriteHandler);
      };
      modalContent.firstChild?.addEventListener("overwrite", overwriteHandler);
    }
    if (handlers?.onClose) {
      const closeHandler = () => {
        handlers.onClose!();
        modal.removeEventListener("close", closeHandler);
      };
      modal.addEventListener("close", closeHandler);
    }
    modal.showModal();
  }
}

export { closeModal, openModalWithJSX };
