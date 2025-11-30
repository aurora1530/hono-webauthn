import { LoadingIndicator } from "../../components/common/LoadingIndicator.js";
import { type ModalEventHandlers, openModal } from "./base.js";

export type MessageModalOptions = {
  loading?: boolean;
};

export const openMessageModal = (
  message: string,
  handlers?: ModalEventHandlers,
  options?: MessageModalOptions,
) => {
  if (options?.loading) {
    openModal(
      <div>
        <LoadingIndicator message={message} inline={false} />
      </div>,
      handlers,
    );
  } else {
    openModal(
      <div>
        <p>{message}</p>
      </div>,
      handlers,
    );
  }
};
