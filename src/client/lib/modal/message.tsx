import { LoadingIndicator } from "../../components/common/LoadingIndicator.js";
import { type ModalEventHandlers, openModal } from "./base.js";

export type MessageModalOptions = {
  loading?: boolean;
} & ModalEventHandlers;

export const openMessageModal = (message: string, options?: MessageModalOptions) => {
  if (options?.loading) {
    openModal(
      <div>
        <LoadingIndicator message={message} inline={false} />
      </div>,
      options,
    );
  } else {
    openModal(
      <div>
        <p>{message}</p>
      </div>,
      options,
    );
  }
};
