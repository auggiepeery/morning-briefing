import { RTI_LOGIN_URL } from "../stretch";

export const DEFAULT_RTI_BASE_URL = "https://www.rtischeduler.com";

export type RtiCredentialMode = "none";

export type RtiConfig = {
  baseUrl: string;
  mode: RtiCredentialMode;
};

/** Public-safe: no owner SESSION / email-key secrets are read. */
export function getRtiConfig(): RtiConfig {
  return {
    baseUrl: DEFAULT_RTI_BASE_URL,
    mode: "none",
  };
}

export function rtiCredentialsConfigured(): boolean {
  return false;
}

export function rtiLoginUrl(): string {
  return RTI_LOGIN_URL;
}
