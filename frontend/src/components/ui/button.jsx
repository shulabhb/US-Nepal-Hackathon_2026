"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./button-variants";

function Button({
  className,
  variant = "default",
  size = "default",
  /** Radix-style prop; Base UI uses `render` instead — strip so it never hits the DOM. */
  asChild: _asChild = undefined,
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
