export type ValidatorsResult = {
  module: string;
  status: "ready";
  generatedAt: string;
};

export function createValidators(): ValidatorsResult {
  return {
    module: "Validators",
    status: "ready",
    generatedAt: new Date().toISOString(),
  };
}

export const Validators = createValidators();

export default Validators;
