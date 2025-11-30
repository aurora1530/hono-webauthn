import { LoadingIndicator } from "../../components/common/LoadingIndicator.js";
import { openModalWithJSX } from "./base.js";

export type MessageModalOptions = {
  loading?: boolean;
};

export const openMessageModal = (
  message: string,
  onClose?: () => void,
  options?: MessageModalOptions,
) => {
  if (options?.loading) {
    openModalWithJSX(
      <div>
        <LoadingIndicator message={message} inline={false} />
      </div>,
    );
  } else {
    openModalWithJSX(
      <div>
        <p>{message}</p>
      </div>,
      {
        onClose,
      },
    );
  }
};
