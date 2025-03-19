import { css } from 'hono/css';
import { jsxRenderer } from 'hono/jsx-renderer';

const authPageRenderer = jsxRenderer(({ children, Layout }) => {
  const authContainerClass = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
  `;

  return (
    <Layout>
      <div class={authContainerClass}>{children}</div>
      <script src="/public/registration.ts"></script>
      <script src="/public/authentication.ts"></script>
    </Layout>
  );
});

export default authPageRenderer;
