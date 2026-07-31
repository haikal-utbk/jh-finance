"use client";

import { useState } from "react";

function formatThousands(digits: string): string {
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

export default function CurrencyInput({
  name,
  required,
  label,
  defaultValue,
}: {
  name: string;
  required?: boolean;
  label?: string;
  defaultValue?: number;
}) {
  const [display, setDisplay] = useState(
    defaultValue ? formatThousands(String(defaultValue)) : ""
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setDisplay(formatThousands(digits));
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          className="input pl-9"
          value={display}
          onChange={handleChange}
          placeholder="0"
          required={required}
        />
      </div>
      <input type="hidden" name={name} value={display.replace(/\./g, "")} />
    </div>
  );
}
