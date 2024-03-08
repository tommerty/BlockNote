import { ComponentPropsWithoutRef, forwardRef } from "react";
import { mergeCSSClasses } from "@blocknote/core";

export const ImageToolbarPanel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { className, children, ...rest } = props;

  return (
    <div
      className={mergeCSSClasses("bn-image-toolbar-panel", className || "")}
      {...rest}
      ref={ref}>
      {children}
    </div>
  );
});
