declare global {
  interface Window {
    __DAWNCHAT_UI_REGISTER_CAPABILITY__?:
      | ((definition: { name: string; [key: string]: unknown }) => boolean)
      | undefined;
    __DAWNCHAT_UI_UNREGISTER_CAPABILITY__?: ((name: string) => boolean) | undefined;
  }
}

export {};
