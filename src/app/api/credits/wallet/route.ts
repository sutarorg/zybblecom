import { creditSummary } from "@/lib/backend/credit-reads";
import { respond } from "@/lib/backend/http";
export const GET = () => respond(creditSummary);
