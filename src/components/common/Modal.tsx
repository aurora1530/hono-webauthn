import type { FC } from 'hono/jsx';

const Modal: FC = async (props) => {
  return (
    <>
      <dialog closedby="any">{props.children}</dialog>
      <script src="/public/modal.ts"></script>
    </>
  );
};

export default Modal;
