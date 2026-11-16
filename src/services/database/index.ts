/**
 * The live database gateway for pages, actions, and webhooks.
 * Firestore repositories are prepared, but they are not used here until the data move is approved.
 * Do not import the generated client from features or pages.
 */
export { prisma } from "./client";
export * from "./reads";
