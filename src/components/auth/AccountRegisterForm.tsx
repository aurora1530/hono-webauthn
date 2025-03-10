import type { FC } from 'hono/jsx';

const AccountRegisterForm: FC = () => {
  return (
    <div>
      <div>
        <input type="text" name="username" id="username"/>
        <button onclick="handleRegistration()">Register</button>
      </div>
      <script src="/public/registration.ts"></script>
    </div>
  );
}

export default AccountRegisterForm;