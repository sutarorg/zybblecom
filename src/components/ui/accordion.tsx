import { Plus } from "lucide-react";
import type { Question } from "@/config/questions";

export function Accordions({ items }: { items: readonly Question[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <details id={item.id} key={item.id}>
          <summary>
            {item.question}
            <Plus size={19} aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
