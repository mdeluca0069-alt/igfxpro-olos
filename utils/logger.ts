export type LoggerResult = {
  module: string;
  status: "ready";
  generatedAt: string;
};

export function createLogger(): LoggerResult {
  return {
    module: "Logger",
    status: "ready",
    generatedAt: new Date().toISOString(),
  };
}

export const Logger = createLogger();

export default Logger;
