import { css, Style } from 'hono/css';
import type { FC } from 'hono/jsx';
import { useRequestContext } from 'hono/jsx-renderer';

const Header: FC = async () => {
  const c = useRequestContext();
  const loginSession = c.get('loginSession');

  const headerClass = css`
    background-color: #f0f0f0;
    padding: 20px;
    border-bottom: 1px solid #ccc;
    position: sticky;
    top: 0;
    z-index: 1000;
  `;

  return (
    <header class={headerClass}>
      <Style>
        {css`
          nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          /* 左上のロゴ用スタイル */
          .logo {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            text-decoration: none;
          }

          nav a {
            text-decoration: none;
            color: #333;
          }

          nav a:hover {
            color: #007bff;
          }
        `}
      </Style>
      <nav>
        <div>
          <a href="/" className="logo">
            Hono WebAuthn Demo
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;
