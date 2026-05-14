import { ReactNode } from "react";

export interface AppShellProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  workspace?: ReactNode;
  floatingAI?: ReactNode;
  notifications?: ReactNode;
  /** Used when sidebar/header/workspace are omitted (e.g. from BootLoader). */
  children?: ReactNode;
}

export const AppShell = ({
  sidebar,
  header,
  workspace,
  floatingAI,
  notifications,
  children,
}: AppShellProps) => {
  const sidebarNode =
    sidebar ??
    (
      <aside className="flex h-full flex-col border-r border-gray-800 bg-[#080c18] p-4">
        <div className="text-lg font-semibold tracking-tight text-cyan-300">
          OLOS
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Terminal workspace
        </p>
      </aside>
    );

  const headerNode =
    header ??
    (
      <header className="flex h-full items-center justify-between px-4 text-sm text-gray-300">
        <span>Control center</span>
        <span className="text-xs text-gray-500">live</span>
      </header>
    );

  const workspaceNode =
    workspace ??
    children ??
    (
      <main className="flex h-full items-center justify-center bg-[#060910] p-8 text-center text-gray-400">
        <div>
          <p className="text-lg font-medium text-gray-200">
            Workspace pronto
          </p>
          <p className="mt-2 max-w-md text-sm">
            Collega qui le route React Router o i moduli trading: questo
            shell è l&apos;involucro istituzionale attorno alla tua area
            operativa.
          </p>
        </div>
      </main>
    );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="w-72 shrink-0 border-r border-gray-800">
        {sidebarNode}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="h-14 shrink-0 border-b border-gray-800">
          {headerNode}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">{workspaceNode}</div>

        <div className="pointer-events-none absolute right-2 top-2">
          {notifications}
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4">
          {floatingAI}
        </div>
      </div>
    </div>
  );
};
