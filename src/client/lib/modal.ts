function openModal(innerHTML: string | HTMLElement) {
  const modal = document.getElementById('main-modal') as HTMLDialogElement | null;
  if (modal) {
    modal.innerHTML = '';
    if (typeof innerHTML === 'string') {
      modal.innerHTML = innerHTML;
    } else {
      modal.appendChild(innerHTML);
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