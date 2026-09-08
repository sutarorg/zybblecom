"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatINR } from "@/lib/money";

export function Calculator() {
  const [price, setPrice] = useState(1499);
  const [students, setStudents] = useState(60);

  const gross = price * 100 * students;
  const fee = Math.round(gross * 0.1);
  const keep = gross - fee;

  const sliderStyle = (value: number, min: number, max: number) =>
    ({ "--fill": `${((value - min) / (max - min)) * 100}%` }) as React.CSSProperties;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Card className="p-6 sm:p-8">
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="calc-price" className="text-sm font-semibold">
                Course price
              </label>
              <span className="font-display text-2xl font-bold">{formatINR(price * 100)}</span>
            </div>
            <input
              id="calc-price"
              type="range"
              min={99}
              max={9999}
              step={50}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="zy-slider w-full"
              style={sliderStyle(price, 99, 9999)}
            />
            <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
              <span>₹99</span>
              <span>₹9,999</span>
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="calc-students" className="text-sm font-semibold">
                Students per month
              </label>
              <span className="font-display text-2xl font-bold">{students}</span>
            </div>
            <input
              id="calc-students"
              type="range"
              min={1}
              max={1000}
              value={students}
              onChange={(e) => setStudents(Number(e.target.value))}
              className="zy-slider w-full"
              style={sliderStyle(students, 1, 1000)}
            />
            <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
              <span>1</span>
              <span>1,000</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col justify-between gap-6 bg-ink p-6 text-paper sm:p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm text-paper/60">Monthly sales</span>
            <span className="font-display text-xl font-semibold">{formatINR(gross)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm text-paper/60">Zybble fee · 10%</span>
            <span className="font-display text-xl font-semibold text-red-300">
              −{formatINR(fee)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-paper/60">Settled to you · 90%</span>
            <span className="font-display text-xl font-semibold text-lime">
              {formatINR(keep)}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-lime p-5 text-ink">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            You keep every month
          </p>
          <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {formatINR(keep)}
          </p>
          <p className="mt-1 text-sm font-medium opacity-70">
            {formatINR(keep * 12)} per year
          </p>
        </div>
      </Card>
    </div>
  );
}
