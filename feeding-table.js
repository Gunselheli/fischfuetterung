(() => {
  const growOutTable = [
    [0, 10, 5.62, "1.5"], [1, 11, 5.59, "1.5 + 2.0"], [2, 12, 5.57, "1.5 + 2.0"],
    [3, 13, 5.55, "2.0"], [4, 15, 5.51, "2.0"], [5, 16, 5.47, "2.0"],
    [6, 18, 5.44, "2.0"], [7, 19, 5.4, "2.0"], [14, 35, 4.99, "2.0"],
    [21, 58, 4.48, "3.0"], [28, 90, 4.04, "3.0"], [35, 132, 3.61, "3.0"],
    [42, 184, 3.16, "4.5"], [49, 242, 2.74, "4.5"], [56, 305, 2.37, "4.5"],
    [63, 372, 2.08, "4.5"], [70, 441, 1.87, "4.5 / 6.0"], [77, 514, 1.7, "4.5 / 6.0"],
    [84, 589, 1.57, "4.5 / 6.0"], [91, 669, 1.5, "4.5 / 6.0"], [98, 754, 1.43, "4.5 / 6.0"],
    [105, 845, 1.36, "4.5 / 6.0"], [112, 940, 1.3, "4.5 / 6.0"], [119, 1040, 1.24, "4.5 / 6.0"],
    [126, 1144, 1.18, "4.5 / 6.0"], [133, 1251, 1.12, "4.5 / 6.0"], [140, 1361, 1.06, "4.5 / 6.0"],
    [147, 1473, 1.02, "4.5 / 6.0"], [154, 1589, 0.97, "4.5 / 6.0"], [161, 1706, 0.92, "4.5 / 6.0"],
    [168, 1826, 0.89, "4.5 / 6.0"], [175, 1948, 0.86, "4.5 / 6.0"], [178, 2000, 0.84, "4.5 / 6.0"]
  ].map(([day, weightG, feedPercent, feedSize]) => ({ day, weightG, feedPercent, feedSize }));

  const fryTable = [
    [1, 0.0025, "Lebendfutter", "Artemia"], [2, 0.005, "Lebendfutter", "Artemia"],
    [3, 0.009, "90% Artemia + 10% 0.2-0.3", "Artemia + Advance"],
    [4, 0.015, "75% Artemia + 25% 0.2-0.3", "Artemia + Advance"],
    [5, 0.022, "50% Artemia + 50% 0.2-0.3", "Artemia + Advance"],
    [6, 0.032, "75% 0.2-0.3 + 25% Artemia", "Advance + Artemia"],
    [7, 0.044, "90% 0.2-0.3 + 10% Artemia", "Advance + Artemia"],
    [8, 0.059, "95% 0.2-0.3 + 5% Artemia", "Advance + Artemia"],
    [9, 0.076, "75% 0.2-0.3 + 25% 0.3-0.5", "Advance"],
    [10, 0.098, "50% 0.2-0.3 + 50% 0.3-0.5", "Advance"],
    [11, 0.122, "25% 0.2-0.3 + 75% 0.3-0.5", "Advance"],
    [12, 0.151, "0.3-0.5", "Advance"], [13, 0.184, "0.3-0.5", "Advance"],
    [14, 0.221, "0.3-0.5", "Advance"], [15, 0.26, "0.3-0.5", "Advance"],
    [16, 0.31, "0.3-0.5", "Advance"], [17, 0.36, "0.3-0.5", "Advance"],
    [18, 0.42, "0.3-0.5", "Advance"], [19, 0.48, "0.3-0.5", "Advance"],
    [20, 0.55, "0.3-0.5", "Advance"], [21, 0.63, "0.5-0.8", "Advance"],
    [22, 0.71, "0.5-0.8", "Advance"], [23, 0.8, "0.5-0.8", "Advance"],
    [24, 0.9, "0.5-0.8", "Advance"], [25, 1, "0.5-0.8", "Advance"],
    [26, 1.1, "0.5-0.8", "Advance"], [27, 1.2, "0.5-0.8", "Advance"],
    [28, 1.4, "0.5-0.8", "Advance"], [29, 1.5, "0.5-0.8", "Advance"],
    [30, 1.6, "0.5-0.8", "Advance"], [31, 1.8, "0.8-1.2", "Advance"],
    [32, 2, "0.8-1.2", "Advance"], [33, 2.1, "0.8-1.2", "Advance"],
    [34, 2.3, "0.8-1.2", "Advance"], [35, 2.5, "0.8-1.2", "Advance"],
    [36, 2.7, "0.8-1.2", "Advance"], [37, 2.9, "0.8-1.2", "Advance"],
    [38, 3.2, "0.8-1.2", "Advance"], [39, 3.4, "0.8-1.2", "Advance"],
    [40, 3.7, "0.8-1.2", "Advance"], [41, 3.9, "1.0", "Start Premium"],
    [42, 4.2, "1.0", "Start Premium"], [43, 4.5, "1.0", "Start Premium"],
    [44, 4.8, "1.0", "Start Premium"], [45, 5.1, "1.0", "Start Premium"],
    [46, 5.4, "1.0", "Start Premium"], [47, 5.8, "1.0", "Start Premium"],
    [48, 6.1, "1.0", "Start Premium"], [49, 6.5, "1.5", "Start Premium"],
    [50, 6.9, "1.5", "Start Premium"], [51, 7.3, "1.5", "Start Premium"],
    [52, 7.7, "1.5", "Start Premium"], [53, 8.1, "1.5", "Start Premium"],
    [54, 8.6, "1.5", "Start Premium"], [55, 9, "1.5", "Start Premium"],
    [56, 9.5, "1.5", "Start Premium"], [57, 10, "1.5", "Start Premium"]
  ].map(([day, weightG, feedSize, feedType]) => ({ day, weightG, feedSize, feedType }));

  const adviceForm = document.querySelector("#feedingAdviceForm");
  const adviceResult = document.querySelector("#feedingAdviceResult");
  const referenceMode = document.querySelector("#feedingReferenceMode");
  const referenceHead = document.querySelector("#feedingReferenceHead");
  const referenceRows = document.querySelector("#feedingReferenceRows");
  const applyButton = document.querySelector("#applyFeedingAdvice");
  const feedingForm = document.querySelector("#feedingForm");
  let lastAdvice = null;

  function closestByWeight(table, weightG) {
    return table.reduce((closest, row) => Math.abs(row.weightG - weightG) < Math.abs(closest.weightG - weightG) ? row : closest, table[0]);
  }

  function adviceFor(stock) {
    const avg = averageWeightG(stock);
    if (avg <= 10) {
      const row = closestByWeight(fryTable, avg);
      const feedPercent = 5.5;
      return { mode: "Fry-Protokoll", row, feedPercent, feedKg: stock.biomassKg * feedPercent / 100, note: "Richtwert nahe Saettigung; laut Tabelle idealerweise auf 6 Futtergaben pro Tag verteilen." };
    }
    const row = closestByWeight(growOutTable, avg);
    return { mode: "Grow-out", row, feedPercent: row.feedPercent, feedKg: stock.biomassKg * row.feedPercent / 100, note: "Richtwert fuer optimale Wasserqualitaet und 26-28 °C." };
  }

  function populateAdviceSelect() {
    if (!adviceForm) return;
    populateSelect(adviceForm.elements.stockId, activeStocks(), stockLabel);
  }

  function renderReference() {
    if (!referenceMode || !referenceHead || !referenceRows) return;
    if (referenceMode.value === "fry") {
      referenceHead.innerHTML = "<tr><th>Tag</th><th>Ø Gewicht</th><th>Futtergroesse</th><th>Futtertyp</th></tr>";
      referenceRows.innerHTML = fryTable.map((row) => `<tr><td>${row.day}</td><td>${row.weightG.toLocaleString("de-AT")} g</td><td>${row.feedSize}</td><td>${row.feedType}</td></tr>`).join("");
      return;
    }
    referenceHead.innerHTML = "<tr><th>Tag</th><th>Ø Gewicht</th><th>Futterlevel</th><th>Futtergroesse</th></tr>";
    referenceRows.innerHTML = growOutTable.map((row) => `<tr><td>${row.day}</td><td>${formatG.format(row.weightG)} g</td><td>${row.feedPercent.toLocaleString("de-AT")} % BM/Tag</td><td>${row.feedSize} mm</td></tr>`).join("");
  }

  function renderAdvice(stock) {
    const advice = adviceFor(stock);
    const row = advice.row;
    lastAdvice = { stockId: stock.id, ...advice };
    const detail = advice.mode === "Grow-out"
      ? `Tabellenpunkt: Tag ${row.day}, ${formatG.format(row.weightG)} g, ${row.feedPercent.toLocaleString("de-AT")} % BM/Tag, ${row.feedSize} mm.`
      : `Tabellenpunkt: Tag ${row.day}, ${row.weightG.toLocaleString("de-AT")} g, ${row.feedSize}, ${row.feedType}.`;

    adviceResult.innerHTML = `<strong>${stockLabel(stock)}</strong><br />Aktuelle Biomasse: ${formatKg.format(stock.biomassKg)} kg.<br />Empfehlung ${advice.mode}: <strong>${formatKg.format(advice.feedKg)} kg Futter pro Tag</strong> bei ${advice.feedPercent.toLocaleString("de-AT")} % BM/Tag.<br />${detail}<br /><span class="muted">${advice.note}</span>`;
    applyButton.disabled = false;
  }

  function syncUi() {
    populateAdviceSelect();
    renderReference();
  }

  const originalRender = render;
  render = () => {
    originalRender();
    syncUi();
  };

  adviceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const stock = stockById(new FormData(adviceForm).get("stockId"));
    if (stock) renderAdvice(stock);
  });

  referenceMode?.addEventListener("change", renderReference);

  applyButton?.addEventListener("click", () => {
    if (!lastAdvice || !feedingForm) return;
    feedingForm.elements.stockId.value = lastAdvice.stockId;
    feedingForm.elements.feedKg.value = lastAdvice.feedKg.toFixed(2);
    feedingForm.elements.deadCount.value = feedingForm.elements.deadCount.value || 0;
    feedingForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  syncUi();
})();
