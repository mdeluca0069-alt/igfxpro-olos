import { createContext, useContext, useState } from "react";

interface Layout {
  id: string;
  widgets: any[];
}

interface WorkspaceContextType {
  layout: Layout;
  saveLayout: (layout: Layout) => void;
  resetLayout: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceManager = ({ children }: any) => {
  const [layout, setLayout] = useState<Layout>({
    id: "default",
    widgets: [],
  });

  const saveLayout = (newLayout: Layout) => {
    setLayout(newLayout);
    localStorage.setItem("workspace", JSON.stringify(newLayout));
  };

  const resetLayout = () => {
    const defaultLayout = { id: "default", widgets: [] };
    setLayout(defaultLayout);
    localStorage.removeItem("workspace");
  };

  return (
    <WorkspaceContext.Provider value={{ layout, saveLayout, resetLayout }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceManager missing");
  return ctx;
};