import { Heading } from "@/components/admin/ui";
import { users } from "@/components/admin/columns";
import { filter, Listing } from "@/components/admin/listing";
import { adminRead } from "@/services/admin/server";
import {
  accountStates,
  choice,
  country,
  cursor,
  one,
  type Query,
} from "@/services/admin/query";
export const metadata = { title: "Users · Admin" };
export default async function Users({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const q = await searchParams;
  const query = {
    search: one(q, "search", 160) || undefined,
    country: country(q),
    status: choice(q, "status", accountStates),
    order:
      choice(q, "order", ["newest", "oldest"] as const) ?? ("newest" as const),
    cursor: cursor(q),
  };
  const result = await adminRead("users", query);
  return (
    <>
      <Heading
        eyebrow="CUSTOMERS"
        title="Users"
        description="Find customer accounts and review their status, project history, and available credits."
      />
      <Listing
        path="/admin/users"
        title="Customer directory"
        plural="Customer records"
        result={result}
        columns={users}
        query={query}
        fields={[
          {
            ...filter("search", "Search", query.search),
            placeholder: "Name or email",
          },
          {
            ...filter("country", "Country code", query.country),
            placeholder: "e.g. IN",
            max: 2,
          },
          filter(
            "status",
            "Account status",
            query.status,
            accountStates,
            "All statuses",
          ),
          {
            key: "order",
            label: "Registration date",
            value: query.order,
            options: [
              ["newest", "Newest first"],
              ["oldest", "Oldest first"],
            ],
          },
        ]}
      />
    </>
  );
}
