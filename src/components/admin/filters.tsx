"use client";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useRef, useState } from "react";
export type FilterField = {
  key: string;
  label: string;
  value?: string;
  placeholder?: string;
  type?: "date" | "text";
  max?: number;
  options?: readonly (readonly [string, string])[];
  hint?: string;
};
export function FilterBar({
  path,
  fields,
  hidden,
  clear = path,
}: {
  path: string;
  fields: readonly FilterField[];
  hidden?: Record<string, string>;
  clear?: string;
}) {
  const baseId = useId();
  const [dateError, setDateError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = fields.filter(
    (f) => f.value && (!f.options || f.value !== f.options[0]?.[0]),
  ).length;
  function form(isDrawer: boolean) {
    const fieldId = (key: string) =>
      `${baseId}-${isDrawer ? "drawer" : "inline"}-${key}`;
    return (
      <form
        className="ad-filter-form"
        aria-label="Record filters"
        action={path}
        onChange={() => {
          if (dateError) setDateError(false);
        }}
        onSubmit={(event) => {
          const form = new FormData(event.currentTarget);
          const from = String(form.get("from") ?? ""),
            to = String(form.get("to") ?? "");
          if (from && to && from > to) {
            event.preventDefault();
            setDateError(true);
            event.currentTarget
              .querySelector<HTMLInputElement>("input[name=to]")
              ?.focus();
            return;
          }
          dialog.current?.close();
        }}
      >
        {Object.entries(hidden ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {fields.map((field) => (
          <div className="ad-filter-field" key={field.key}>
            <label htmlFor={fieldId(field.key)}>{field.label}</label>
            {field.options ? (
              <select
                id={fieldId(field.key)}
                name={field.key}
                defaultValue={field.value ?? ""}
                aria-describedby={
                  field.hint ? `${fieldId(field.key)}-hint` : undefined
                }
              >
                {field.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={fieldId(field.key)}
                name={field.key}
                aria-describedby={
                  field.hint
                    ? `${fieldId(field.key)}-hint`
                    : dateError && field.key === "to"
                      ? `${fieldId("to")}-error`
                      : undefined
                }
                aria-invalid={(dateError && field.key === "to") || undefined}
                defaultValue={field.value}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                maxLength={field.max ?? 160}
                autoComplete="off"
              />
            )}
            {field.hint && (
              <small id={`${fieldId(field.key)}-hint`}>{field.hint}</small>
            )}
            {dateError && field.key === "to" && (
              <span
                id={`${fieldId("to")}-error`}
                role="alert"
                className="ad-command-error"
              >
                End date must be on or after the start date.
              </span>
            )}
          </div>
        ))}
        <div className="ad-filter-actions">
          <button className="ad-button ad-primary" type="submit">
            Apply filters
          </button>
          {isDrawer && (
            <button
              className="ad-button"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
          )}
          {count > 0 && (
            <Link
              className="ad-clear"
              href={clear}
              onClick={() => dialog.current?.close()}
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>
    );
  }
  return (
    <div className="ad-filters">
      <div className="ad-desktop-filters">{form(false)}</div>
      <div className="ad-mobile-filters">
        <button
          type="button"
          className="ad-button"
          onClick={() => dialog.current?.showModal()}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{count > 0 ? ` (${count})` : ""}
        </button>
        {count > 0 && (
          <Link className="ad-clear" href={clear}>
            Clear filters
          </Link>
        )}
        {fields[0]?.key === "search" && (
          <span>
            <Search size={15} aria-hidden="true" />
            {fields[0].value ? "Search applied" : "Search & refine"}
          </span>
        )}
      </div>
      <dialog
        ref={dialog}
        className="ad-filter-dialog"
        aria-label="Filter records"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="ad-dialog-inner">
          <div className="ad-dialog-top">
            <h2>Filter records</h2>
            <button
              className="ad-icon"
              type="button"
              aria-label="Close filters"
              onClick={() => dialog.current?.close()}
            >
              <X size={18} />
            </button>
          </div>
          {form(true)}
        </div>
      </dialog>
    </div>
  );
}
