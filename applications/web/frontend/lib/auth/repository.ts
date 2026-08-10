import { HttpAuthRepository } from "./http-repository";
import type { AuthRepository } from "./types";

/**
 * The single place that decides which backend the app talks to.
 *
 * The live NestJS API implementation is selected here so pages stay decoupled
 * from transport and token-storage details.
 */
export const authRepository: AuthRepository = new HttpAuthRepository();
