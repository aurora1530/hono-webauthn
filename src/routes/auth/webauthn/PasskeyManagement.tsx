import type { Passkey } from '@prisma/client';
import type { FC } from 'hono/jsx';

const PasskeyManagement: FC<{ passkeys: Passkey[] }> = ({ passkeys }) => {
  return (
    <div>
      <h2 class="text-lg font-medium mb-4">パスキー管理</h2>
      {passkeys.length === 0 ? (
        <p>登録されているパスキーはありません。</p>
      ) : (
        <ul class="space-y-4">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              class="p-4 border rounded-md flex justify-between items-center"
            >
              <div>
                <p class="font-semibold">{passkey.name}</p>
                <button id="change-passkey-name-btn" onclick={`handleChangePasskeyName("${passkey.id}")`}>変更</button>
                <p class="text-sm text-gray-600">
                  登録日時: {passkey.createdAt.toLocaleString()}
                </p>
              </div>
              <button
                class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                onClick={() => {
                  // パスキー削除処理をここに実装
                  alert(`パスキー ${passkey.id} を削除しました。`);
                }}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
      <script src="/public/changePasskeyName.ts"></script>
    </div>
  );
};

export default PasskeyManagement;