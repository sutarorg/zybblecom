import { redirect } from "next/navigation";
export default function PurchaseHistory() {
  redirect("/credits/history?filter=purchases");
}
