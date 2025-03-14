import type { FC } from 'hono/jsx';

const LoginForm: FC = () => {
  return (
    <div>
      <div>
        <button onclick="handleAuthentication()">Login</button>
      </div>
      <script src="/public/authentication.ts"></script>
    </div>
  );
};

export default LoginForm;
