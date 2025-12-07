import type { FC } from "hono/jsx";
import Modal from "./Modal.js";

type ServerMessageModalProps = {
  message: string;
};

const ServerMessageModal: FC<ServerMessageModalProps> = ({ message }) => {
  return (
    <Modal dialogID="server-message-modal" isOpenInitially={true}>
      <p>{message}</p>
    </Modal>
  );
};

export default ServerMessageModal;
