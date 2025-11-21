import { openModal } from "./base.ts";

export const openMessageModal = (message: string, onClose?: () => void) => {
  const contentElement = document.createElement("div");
  const messageElement = document.createElement("p");
  messageElement.textContent = message;
  contentElement.appendChild(messageElement);

  openModal(contentElement, onClose);
};
