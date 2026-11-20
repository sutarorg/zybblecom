import { FilterBar, type FilterField } from "./filters";
import { Pager, Records, type Column } from "./ui";
import type { Page, Result } from "@/services/admin/contracts";
import { label } from "@/services/admin/format";
export function filter(
  key: string,
  name: string,
  value?: string,
  options?: readonly string[],
  all = "All",
): FilterField {
  return {
    key,
    label: name,
    value,
    options: options
      ? [["", all], ...options.map((v) => [v, label(v)] as const)]
      : undefined,
  };
}
export function dates(from?: string, to?: string): FilterField[] {
  return [
    { key: "from", label: "From date (UTC)", type: "date", value: from },
    { key: "to", label: "To date (UTC)", type: "date", value: to },
  ];
}
export function Listing<T extends { id: string }>({
  path,
  title,
  result,
  columns,
  query,
  fields,
  plural,
  children,
}: {
  path: string;
  title: string;
  result: Result<Page<T>>;
  columns: readonly Column<T>[];
  query: Record<string, string | undefined>;
  fields: FilterField[];
  plural: string;
  children?: React.ReactNode;
}) {
  return (
    <Records
      title={title}
      result={result}
      columns={columns}
      record={title}
      plural={plural}
      filtered={fields.some(
        (f) => f.value && (!f.options || f.value !== f.options[0]?.[0]),
      )}
      filters={
        <FilterBar key={JSON.stringify(query)} path={path} fields={fields} />
      }
      pager={
        result.ok && <Pager path={path} params={query} page={result.value} />
      }
    >
      {children}
    </Records>
  );
}
