import { LoadingIndicator } from "../../components/common/LoadingIndicator.js";
import { type ModalEventHandlers, openModalWithJSX } from "./base.js";

export type MessageModalOptions = {
  loading?: boolean;
};

export const openMessageModal = (
  message: string,
  handlers?: ModalEventHandlers,
  options?: MessageModalOptions,
) => {
  if (options?.loading) {
    openModalWithJSX(
      <div>
        <LoadingIndicator message={message} inline={false} />
      </div>,
      handlers,
    );
  } else {
    openModalWithJSX(
      <div>
        <p>{message}</p>
      </div>,
      handlers,
    );
  }
};
