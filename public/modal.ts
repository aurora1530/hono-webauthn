function openModal() {
  const modal = document.querySelector('dialog');
  if (modal) {
    modal.showModal();
  }
}

function closeModal() {
  const modal = document.querySelector('dialog');
  if (modal) {
    modal.close();
  }
}