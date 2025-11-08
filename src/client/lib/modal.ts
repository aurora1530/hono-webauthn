function openModal(innerHTML: string | HTMLElement, onClose?: () => void) {
  const modal = document.getElementById('main-modal') as HTMLDialogElement | null;
  const modalContent = document.getElementById('main-modal-content');
  if (modal && modalContent) {
    modalContent.innerHTML = '';
    if (typeof innerHTML === 'string') {
      modalContent.innerHTML = innerHTML;
    } else {
      modalContent.appendChild(innerHTML);
    }

    if (onClose) {
      const closeHandler = () => {
        onClose();
        modal.removeEventListener('close', closeHandler);
      };
      modal.addEventListener('close', closeHandler);
    }
    modal.showModal();
  }
}

function closeModal() {
  const modal = document.getElementById('main-modal') as HTMLDialogElement | null;
  if (modal) {
    modal.close();
  }
}

export { openModal, closeModal };