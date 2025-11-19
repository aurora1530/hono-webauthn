import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';
import { loginSessionController } from '../../lib/auth/loginSession.ts';

const Profile: FC = async () => {
  const c = useRequestContext();
  const userData = await loginSessionController.getUserData(c);
  if (!userData) {
    return (
      <div>
        <h1>プロフィールページ</h1>
        <p>ログインしてください。</p>
        <a href="/auth/login">ログインページへ</a>
      </div>
    );
  }

  return (
    <div>
      <h1>プロフィールページ</h1>
      <p>ようこそ、{userData.username}さん</p>
      <div>
        <label>
          <input type="checkbox" checked={!!userData.debugMode} id="change-debug-mode-btn"/>
          デバッグモード
        </label>
      </div>
      <script src='/public/profile.js' type="module"></script>
    </div>
  );
};

export default Profile;
