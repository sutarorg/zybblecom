"use client";
import { Search } from "lucide-react";
import { useState } from "react";
import { questions, type Topic } from "@/config/questions";
import { Accordions } from "@/components/ui/accordion";

const topics: (Topic | "All topics")[] = [
  "All topics",
  "Getting started",
  "Clips & exports",
  "Credits & pricing",
];
export function HelpSearch() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]>("All topics");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = questions.filter(
    (item) =>
      (topic === "All topics" || item.topic === topic) &&
      terms.every((term) =>
        `${item.question} ${item.answer} ${item.topic}`
          .toLowerCase()
          .includes(term),
      ),
  );
  return (
    <>
      <div role="search" className="search-field">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="help-search">
          Search help topics
        </label>
        <input
          id="help-search"
          type="search"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics…"
        />
      </div>
      <div className="filter-row" aria-label="Filter by topic">
        {topics.map((item) => (
          <button
            className="filter"
            key={item}
            type="button"
            aria-pressed={item === topic}
            onClick={() => setTopic(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="results-count" role="status">
        {results.length} {results.length === 1 ? "answer" : "answers"}
      </p>
      {results.length ? (
        <Accordions items={results} />
      ) : (
        <div className="empty-state">
          <h2>No matching answers</h2>
          <p>Try another word, or clear the filters to see all topics.</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setQuery("");
              setTopic("All topics");
              document.getElementById("help-search")?.focus();
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
