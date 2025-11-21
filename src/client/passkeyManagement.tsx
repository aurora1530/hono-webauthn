import { handleChangePasskeyName } from './lib/changePasskeyName.js';
import { handleDeletePasskey } from './lib/deletePasskey.js';
import { handleRegistration } from './lib/registration.js';
import { openModalWithJSX } from './lib/modal/base.js';
import { openMessageModal } from './lib/modal/message.js';
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
  const res = await webauthnClient['passkey-histories'].$post({
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
      passkeyId={passkeyId}
      histories={histories}
      page={data.page}
      totalPages={data.totalPages}
      total={data.total}
      limit={data.limit}
      onChangePage={handleChangePage}
      reload={() => openPasskeyHistoryModal(passkeyId, data.page)}
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

// --- Test authentication per passkey ---
const testPasskeyBtns = document.getElementsByClassName('test-passkey-btn') as HTMLCollectionOf<HTMLButtonElement>;

async function handleTestAuthentication(passkeyId: string) {
  openMessageModal('認証テストを開始します...');
  const generateRes = await webauthnClient['test-authentication'].generate.$post({
    json: { passkeyId },
  });
  if (!generateRes.ok) {
    openMessageModal('認証テスト開始に失敗しました。');
    return;
  }
  const json = await generateRes.json();
  let options: PublicKeyCredentialRequestOptions;
  try {
    options = PublicKeyCredential.parseRequestOptionsFromJSON(json);
  } catch (e) {
    console.error(e);
    openMessageModal('認証テスト用オプションの解析に失敗しました。');
    return;
  }
  try {
    const credential = await navigator.credentials.get({ publicKey: options });
    const verifyRes = await webauthnClient['test-authentication'].verify.$post({
      json: { body: credential },
    });
    if (!verifyRes.ok) {
      const err = (await verifyRes.json()).error;
      openMessageModal(`認証テストに失敗しました。エラー: ${err}`);
      return;
    }
    openMessageModal('認証テストが成功しました。');
  } catch (e) {
    console.error(e);
    openMessageModal('認証テストに失敗しました。キャンセルされたか、エラーが発生しました。');
  }
}

Array.from(testPasskeyBtns).forEach((btn) => {
  btn.addEventListener('click', async () => {
    const passkeyId = btn.dataset.passkeyId;
    if (passkeyId) {
      await handleTestAuthentication(passkeyId);
    }
  });
});
