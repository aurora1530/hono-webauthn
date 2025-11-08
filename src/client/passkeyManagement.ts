import { handleChangePasskeyName } from "./lib/changePasskeyName.ts";
import { handleDeletePasskey } from "./lib/deletePasskey.ts";
import { handleRegistration } from "./lib/registration.ts";

document.getElementById('add-passkey-button')?.addEventListener('click', () => {
  handleRegistration(false);
});

const changePasskeyNameBtns = document.getElementsByClassName('change-passkey-name-btn') as HTMLCollectionOf<HTMLButtonElement>;
Array.from(changePasskeyNameBtns).forEach((btn) => {
  btn.addEventListener('click', () => {
    const passkeyId = btn.dataset.passkeyId;
    const passkeyName = btn.dataset.passkeyName;
    if (passkeyId && passkeyName) handleChangePasskeyName(passkeyId, passkeyName);
  });
});

const deletePasskeyBtns = document.getElementsByClassName('delete-passkey-btn') as HTMLCollectionOf<HTMLButtonElement>;
Array.from(deletePasskeyBtns).forEach((btn) => {
  btn.addEventListener('click', () => {
    const passkeyId = btn.dataset.passkeyId;
    const onlySyncedPasskey = btn.dataset.onlySyncedPasskey === 'true';
    if (passkeyId) handleDeletePasskey(passkeyId, onlySyncedPasskey);
  });
});