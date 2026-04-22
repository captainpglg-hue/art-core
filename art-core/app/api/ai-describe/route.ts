/**
 * /api/ai-describe
 *
 * Alias of /api/ai/describe — exists because the certifier page calls
 * /api/ai-describe directly. Both routes point to the same logic.
 */
export { POST } from "@/app/api/ai/describe/route";
