import type { Child } from "hono/jsx";
import { render } from "hono/jsx/dom";

function openModal(contentElement: HTMLElement, onClose?: () => void) {
  const modal = document.getElementById("main-modal") as HTMLDialogElement | null;
  const modalContent = document.getElementById("main-modal-content");
  if (modal && modalContent) {
    modalContent.innerHTML = "";
    modalContent.appendChild(contentElement);

    if (onClose) {
      const closeHandler = () => {
        onClose();
        modal.removeEventListener("close", closeHandler);
      };
      modal.addEventListener("close", closeHandler);
    }
    modal.showModal();
  }
}

function closeModal() {
  const modal = document.getElementById("main-modal") as HTMLDialogElement | null;
  if (modal) {
    modal.close();
  }
}

function openModalWithJSX(content: Child, onClose?: () => void) {
  const modal = document.getElementById("main-modal") as HTMLDialogElement | null;
  const modalContent = document.getElementById("main-modal-content");
  if (modal && modalContent) {
    render(content, modalContent);
    if (onClose) {
      const closeHandler = () => {
        onClose();
        modal.removeEventListener("close", closeHandler);
      };
      modal.addEventListener("close", closeHandler);
    }
    modal.showModal();
  }
}

export { openModal, closeModal, openModalWithJSX };
