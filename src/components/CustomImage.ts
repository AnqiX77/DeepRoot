import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      width: { default: null },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
