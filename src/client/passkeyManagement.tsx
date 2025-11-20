import { handleChangePasskeyName } from './lib/changePasskeyName.js';
import { handleDeletePasskey } from './lib/deletePasskey.js';
import { handleRegistration } from './lib/registration.js';
import { openModalWithJSX } from './lib/modal/base.js';
import PasskeyHistories from './components/PasskeyHistories.js';
import { webauthnClient } from './lib/rpc/webauthnClient.js';

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

const viewPasskeyHistoryBtns = document.getElementsByClassName(
  'view-passkey-history-btn'
) as HTMLCollectionOf<HTMLButtonElement>;

async function openPasskeyHistoryModal(passkeyId: string, page = 1) {
  const HISTORY_PAGE_LIMIT = 10;
  const res = await webauthnClient['passkey-history'].$post({
    json: { passkeyId, limit: HISTORY_PAGE_LIMIT, page },
  });

  if (!res.ok) {
    alert(
      `Error fetching passkey history: ${(await res.json()).error || 'Unknown error'}`
    );
    return;
  }

  const data = await res.json();

  const histories = data.histories.map((h) => ({
    ...h,
    usedAt: new Date(h.usedAt),
  }));

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage === data.page || nextPage > data.totalPages) return;
    openPasskeyHistoryModal(passkeyId, nextPage);
  };

  openModalWithJSX(
    <PasskeyHistories
      histories={histories}
      page={data.page}
      totalPages={data.totalPages}
      total={data.total}
      limit={data.limit}
      onChangePage={handleChangePage}
    />
  );
}

Array.from(viewPasskeyHistoryBtns).forEach((btn) => {
  btn.addEventListener('click', async () => {
    const passkeyId = btn.dataset.passkeyId;
    if (passkeyId) {
      await openPasskeyHistoryModal(passkeyId, 1);
    }
  });
});
