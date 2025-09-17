import React, { useMemo, useState } from "react";

// ===============================
// Boostly AE Commission Calculator
// Rules encoded from Kevin's spec & reference sheet
// ===============================
// Base Structure (defaults — editable in UI):
// - Quota: $72,000 ARR (= $6,000 MRR/mo)
// - Payout at 100% quota: $5,833 (pro-rated below quotaArr, capped at full)
// - Bundling Bonus: +$500 at >=20% bundle rate; +$1,000 at >=35%
// - Accelerator for Exceeding Quota:
//     * Every $1 ARR above quota is treated as ($1/12) MRR → comp credit = (Over-Quota ARR / 12) * $1.25
//     * Optional: For the bundled share of the over-quota ARR,
//       add +$0.25 per $1 MRR for that share (effective $1.50 per $1 MRR on that share). Off by default
//       to match the provided sheet example.
// - "Pre-Paid Kicker" and "Clawbacks" are added/subtracted straight to payout
//
// Bundle definition reminder (display only):
//   Bundle = SMS + at least 1 Marketing Package with min $1,560 ARR ($130 MRR)

export default function CommissionCalculatorApp() {
  // ---- Admin/Config (editable in the UI) ----
  const [quotaARR, setQuotaARR] = useState(72000);
  const [basePayoutAt100, setBasePayoutAt100] = useState(5833);
  const [bundle20Bonus, setBundle20Bonus] = useState(500);
  const [bundle35Bonus, setBundle35Bonus] = useState(1000);

  // ---- AE Inputs ----
  const [arrSold, setArrSold] = useState(93600); // example to mirror the screenshot

  const [totalDeals, setTotalDeals] = useState(22);
  const [bundleCount, setBundleCount] = useState(7);

  const [prepaidKicker, setPrepaidKicker] = useState(100);
  const [clawbacks, setClawbacks] = useState(0);

  // Advanced accelerator option — OFF by default to match the sheet example
  const [useOverQuotaBundleShare, setUseOverQuotaBundleShare] = useState(false);
  const [overQuotaBundleSharePct, setOverQuotaBundleSharePct] = useState(0); // % of over-quota MRR that is bundled

  // ---- Helpers ----
  const toNumber = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  };
  const fmtMoney = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const clampPct = (n) => Math.min(100, Math.max(0, n));

  // ---- Derived values ----
  const computed = useMemo(() => {
    const quotaArr = Math.max(0, toNumber(quotaARR));
    const baseAt100 = Math.max(0, toNumber(basePayoutAt100));
    const arr = Math.max(0, toNumber(arrSold));
    

    

    const attainment = quotaArr > 0 ? arr / quotaArr : 0; // 1.3 = 130%

    // Base payout pro-rated below 100% and capped at full
    const basePayout = Math.min(1, attainment) * baseAt100;

    const deals = Math.max(0, Math.floor(toNumber(totalDeals)));
    const bundles = Math.max(0, Math.floor(toNumber(bundleCount)));
    const bundlePct = deals > 0 ? bundles / deals : 0; // 0..1

    // Bundling bonus tiers
    let bundleBonus = 0;
    if (bundlePct >= 0.35) bundleBonus = toNumber(bundle35Bonus);
    else if (bundlePct >= 0.20) bundleBonus = toNumber(bundle20Bonus);

    // Accelerator above quota
    const overARR = Math.max(0, arr - quotaArr);

    // Base accelerator: $1.25 per $1 of over-quota MRR
    let accelerator = (overARR / 12) * 1.25;

    // Optional extra +$0.25 for the share of over-quota that's bundled
    if (useOverQuotaBundleShare) {
      const share = clampPct(toNumber(overQuotaBundleSharePct)) / 100; // 0..1
      accelerator += (overARR / 12) * share * 0.25;
    }

    const kicker = toNumber(prepaidKicker);
    const cb = toNumber(clawbacks);

    const total = basePayout + bundleBonus + accelerator + kicker - cb;

    return {
      arr,
      quotaArr,
      attainment,
      basePayout,
      bundlePct,
      bundleBonus,
      overARR,
      accelerator,
      kicker,
      clawbacks: cb,
      total,
    };
  }, [
    quotaARR,
    basePayoutAt100,
    bundle20Bonus,
    bundle35Bonus,
    
    arrSold,
    
    totalDeals,
    bundleCount,
    prepaidKicker,
    clawbacks,
    useOverQuotaBundleShare,
    overQuotaBundleSharePct,
  ]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Boostly • AE Commission Calculator</h1>
          <div className="text-sm text-neutral-500">Bundle = SMS + ≥1 Marketing Package, min $1,560 ARR ($130 MRR)</div>
        </header>

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <section className="col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
            <h2 className="font-semibold mb-3">Sales Inputs</h2>

            

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="ARR Sold (this month)"
                prefix="$"
                value={arrSold}
                onChange={setArrSold}
              />

              <LabeledInput
                label="Total Deals"
                type="number"
                value={totalDeals}
                onChange={setTotalDeals}
              />

              <LabeledInput
                label="Bundle Count"
                type="number"
                value={bundleCount}
                onChange={setBundleCount}
                hint="Deals that meet the Bundle definition"
              />

              <LabeledInput
                label="Pre-Paid Kicker"
                prefix="$"
                value={prepaidKicker}
                onChange={setPrepaidKicker}
              />

              <LabeledInput
                label="Clawbacks"
                prefix="$"
                value={clawbacks}
                onChange={setClawbacks}
              />
            </div>

            {/* Advanced accelerator control */}
            <div className="mt-4 border-t pt-4">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={useOverQuotaBundleShare}
                  onChange={(e) => setUseOverQuotaBundleShare(e.target.checked)}
                />
                <span className="text-sm font-medium">Advanced: apply extra +$0.25 per $1 (MRR) to the bundled share of over-quota ARR</span>
              </label>
              {useOverQuotaBundleShare && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabeledInput
                    label="Bundled Share of Over-Quota (as %)"
                    suffix="%"
                    value={overQuotaBundleSharePct}
                    onChange={setOverQuotaBundleSharePct}
                    hint="If unknown, use your bundle % of deals as a proxy"
                  />
                  <div className="text-sm text-neutral-600">This adds +$0.25 per $1 MRR (i.e., (Over-Quota ARR / 12) * $0.25) to the bundled share of the over-quota amount (effective $1.50 per $1 MRR on that portion).</div>
                </div>
              )}
            </div>
          </section>

          {/* Config panel */}
          <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
            <h2 className="font-semibold mb-3">Plan Config</h2>
            <div className="grid grid-cols-1 gap-3">
              <LabeledInput label="Quota (ARR)" prefix="$" value={quotaARR} onChange={setQuotaARR} />
              <LabeledInput label="Base Payout @ 100%" prefix="$" value={basePayoutAt100} onChange={setBasePayoutAt100} />
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="font-medium mb-2">Bundling Bonus Tiers</div>
              <div className="grid grid-cols-1 gap-3">
                <LabeledInput label="≥ 20% bundle rate" prefix="$" value={bundle20Bonus} onChange={setBundle20Bonus} />
                <LabeledInput label="≥ 35% bundle rate" prefix="$" value={bundle35Bonus} onChange={setBundle35Bonus} />
              </div>
            </div>
          </section>
        </div>

        {/* Output */}
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
          <h2 className="font-semibold mb-4">Payout Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <KPI label="ARR Sold" value={fmtMoney(computed.arr)} />
            <KPI label="Quota Attainment" value={`${(computed.attainment * 100).toFixed(2)}%`} />
            <KPI label="Over-Quota ARR" value={fmtMoney(computed.overARR)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border rounded-xl p-3 bg-neutral-50">
              <LineItem label="Base Payout" value={fmtMoney(computed.basePayout)} />
              <LineItem label={`Bundling Bonus (${(computed.bundlePct * 100).toFixed(0)}%)`} value={fmtMoney(computed.bundleBonus)} />
              <LineItem label="Accelerator" value={fmtMoney(computed.accelerator)} />
              <LineItem label="Pre-Paid Kicker" value={fmtMoney(computed.kicker)} />
              <LineItem label="Clawbacks" value={`- ${fmtMoney(computed.clawbacks)}`} />
              <div className="my-2 border-t" />
              <LineItem label="Total Payout" value={fmtMoney(computed.total)} bold large />
            </div>

            <div className="text-sm leading-relaxed text-neutral-700">
              <p className="mb-2 font-medium">How it’s calculated</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><span className="font-medium">Base:</span> Pro-rated up to 100% → <code>min(1, ARR/Quota) × Base@100%</code></li>
                <li><span className="font-medium">Bundling bonus:</span> +{fmtMoney(Number(bundle20Bonus))} at ≥20% bundles, +{fmtMoney(Number(bundle35Bonus))} at ≥35%.</li>
                <li><span className="font-medium">Accelerator:</span> (Over-quota ARR / 12) × $1.25. Optional +$0.25 for the bundled share of over-quota.</li>
                <li><span className="font-medium">Total:</span> Base + Bonus + Accelerator + Pre-Paid − Clawbacks.</li>
              </ul>
              <div className="mt-3 p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
                <div className="font-medium">Bundle definition</div>
                SMS + ≥1 Marketing Package with minimum $1,560 ARR ($130 MRR).
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-6 text-xs text-neutral-500">
          © {new Date().getFullYear()} Boostly – Internal tool. Built for clarity; numbers shown are estimates based on inputs.
        </footer>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function LineItem({ label, value, bold = false, large = false }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className={`text-neutral-700 ${bold ? "font-semibold" : ""}`}>{label}</div>
      <div className={`${bold ? "font-semibold" : ""} ${large ? "text-lg" : ""}`}>{value}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, prefix, suffix, type = "text", hint }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{prefix}</span>}
        <input
          className={`w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-9" : ""}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-neutral-500 mt-1">{hint}</div>}
    </label>
  );
}
