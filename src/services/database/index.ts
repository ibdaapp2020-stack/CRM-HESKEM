/**
 * The only database gateway for application code.
 * Prisma stays here until a Firestore implementation replaces this module.
 * Do not import the generated client from features or pages.
 */
export { prisma } from "./client";
export * from "./reads";
