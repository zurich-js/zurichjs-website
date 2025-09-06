import React from "react";

type ComponentProps = {
  // TODO: better typing for 'is' prop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is: any;
  children?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & React.ComponentPropsWithoutRef<any>;

const KitComponent: React.FC<ComponentProps> = ({ is: Tag, children, ...rest }) => {
  return <Tag {...rest}>{children}</Tag>;
};

export default KitComponent;
