
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-display font-bold text-foreground">
        {title}
      </h1>
      {children}
    </div>
  );
};

export default PageHeader;
