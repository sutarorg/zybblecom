/** Format paise as an INR string, e.g. 49900 -> "₹499" / 49950 -> "₹499.50" */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const hasPaise = paise % 100 !== 0;
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(rupees)
  );
}

/** All financial math happens server-side, in integer paise. */
export function computeSplit(grossPaise: number, feePercent: number) {
  const feePaise = Math.round((grossPaise * feePercent) / 100);
  return { feePaise, creatorPaise: grossPaise - feePaise };
}
