import Link from "next/link";
import { Heading, State } from "@/components/admin/ui";
export default function Missing() {
  return (
    <>
      <Heading
        eyebrow="ADMIN"
        title="Record unavailable"
        description="The record could not be found or is not accessible."
      />
      <State
        title="Return to the console"
        text="Use navigation or check the record reference."
      >
        <Link href="/admin" className="ad-button ad-primary">
          Admin overview
        </Link>
      </State>
    </>
  );
}
