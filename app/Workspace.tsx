import { ReactNode } from "react";
import { useWorkspace } from "./WorkspaceManager";

interface WorkspaceProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  widgets?: ReactNode[];
}

export const Workspace = ({
  sidebar,
  header,
  widgets = [],
}: WorkspaceProps) => {
  const { layout } = useWorkspace();

  return (
    <div className="w-full h-screen flex bg-black text-white">
      {/* SIDEBAR */}
      <div className="w-64 border-r border-gray-800">{sidebar}</div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-gray-800">{header}</div>

        <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
          {widgets.length > 0
            ? widgets.map((w, i) => (
                <div key={i} className="col-span-4 bg-gray-900 rounded-lg">
                  {w}
                </div>
              ))
            : layout.widgets.map((w: any, i: number) => (
                <div key={i} className="col-span-4 bg-gray-900 rounded-lg">
                  {w.component}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};