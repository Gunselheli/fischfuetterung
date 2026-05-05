const STORAGE_KEY = "fischfuetterung-state-v1";

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatInt = new Intl.NumberFormat("de-AT", { maximumFractionDigits: 0 });
const formatKg = new Intl.NumberFormat("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatG = new Intl.NumberFormat("de-AT", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const emptyState = () => ({
  batches: [],
  tanks: [],
  stocks: [],
  feedings: [],
  sortings: [],
  harvests: []
});

let state = loadState();

const forms = {
  batch: document.querySelector("#batchForm"),
  tank: document.querySelector("#tankForm"),
  stocking: document.querySelector("#stockingForm"),
  feeding: document.querySelector("#feedingForm"),
  sorting: document.querySelector("#sortingForm"),
  harvest: document.querySelector("#harvestForm"),
  target: document.querySelector("#targetForm")
};

const els = {
  metrics: document.querySelector("#metrics"),
  stockRows: document.querySelector("#stockRows"),
  timeline: document.querySelector("#timeline"),
  splitTargets: document.querySelector("#splitTargets"),
  splitTargetTemplate: document.querySelector("#splitTargetTemplate"),
  targetResult: document.querySelector("#targetResult"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  resetData: document.querySelector("#resetData")
};

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedState();

  try {
    return { ...emptyState(), ...JSON.parse(stored) };
  } catch {
    return seedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedState() {
  const batchId = uid("batch");
  const tankA = uid("tank");
  const tankB = uid("tank");

  return {
    ...emptyState(),
    batches: [
      {
        id: batchId,
        supplier: "Beispiel Lieferant",
        date: today(),
        count: 4200,
        avgWeightG: 18,
        feedConversion: 1,
        createdAt: new Date().toISOString()
      }
    ],
    tanks: [
      { id: tankA, name: "B-01", volume: 18, note: "Anzucht", createdAt: new Date().toISOString() },
      { id: tankB, name: "B-02", volume: 18, note: "Anzucht", createdAt: new Date().toISOString() }
    ],
    stocks: [
      createStock({ batchId, tankId: tankA, count: 2100, avgWeightG: 18, date: today(), origin: "Erstbesatz" }),
      createStock({ batchId, tankId: tankB, count: 2100, avgWeightG: 18, date: today(), origin: "Erstbesatz" })
    ],
    feedings: [],
    sortings: [],
    harvests: []
  };
}

function createStock({ id = uid("stock"), batchId, tankId, count, avgWeightG, date, origin, parentStockId = null }) {
  const safeCount = Math.max(0, Math.round(number(count)));
  const safeAvg = Math.max(0, number(avgWeightG));

  return {
    id,
    batchId,
    tankId,
    count: safeCount,
    initialCount: safeCount,
    initialAvgWeightG: safeAvg,
    biomassKg: (safeCount * safeAvg) / 1000,
    feedKg: 0,
    mortality: 0,
    harvestedCount: 0,
    transferredOut: 0,
    createdAt: date || today(),
    origin,
    parentStockId,
    closedAt: null
  };
}

const batchById = (id) => state.batches.find((batch) => batch.id === id);
const tankById = (id) => state.tanks.find((tank) => tank.id === id);
const stockById = (id) => state.stocks.find((stock) => stock.id === id);
const activeStocks = () => state.stocks.filter((stock) => stock.count > 0 && !stock.closedAt);
const averageWeightG = (stock) => (stock && stock.count > 0 ? (stock.biomassKg * 1000) / stock.count : 0);
const feedConversion = (stock) => batchById(stock.batchId)?.feedConversion || 1;

function targetWeightFor(stock) {
  const avg = averageWeightG(stock);
  if (avg < 300) return 300;
  if (avg < 500) return 500;
  return 1500;
}

function feedNeededKg(stock, targetG = targetWeightFor(stock)) {
  const targetBiomassKg = (stock.count * targetG) / 1000;
  return Math.max(0, targetBiomassKg - stock.biomassKg) / feedConversion(stock);
}

function stockLabel(stock) {
  const batch = batchById(stock.batchId);
  const tank = tankById(stock.tankId);
  return `${tank?.name || "Unbekannt"} | ${batch?.supplier || "Charge"} | ${formatInt.format(stock.count)} Stk | ${formatG.format(averageWeightG(stock))} g`;
}

function populateSelect(select, items, getLabel, placeholder = "Bitte waehlen") {
  const current = select.value;
  select.innerHTML = "";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = placeholder;
  select.append(blank);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = getLabel(item);
    select.append(option);
  });

  if (items.some((item) => item.id === current)) select.value = current;
}

function renderSplitTargets() {
  if (els.splitTargets.children.length > 0) return;

  for (let index = 0; index < 3; index += 1) {
    const fragment = els.splitTargetTemplate.content.cloneNode(true);
    fragment.querySelector("legend").textContent = `Zielbecken ${index + 1}`;
    els.splitTargets.append(fragment);
  }
}

function updateSelects() {
  document.querySelectorAll('select[name="batchId"]').forEach((select) => {
    populateSelect(select, state.batches, (batch) => `${batch.supplier} | ${batch.date} | ${formatInt.format(batch.count)} Stk`);
  });

  document.querySelectorAll('select[name="tankId"], select[name="targetTankId"]').forEach((select) => {
    populateSelect(select, state.tanks, (tank) => `${tank.name}${tank.volume ? ` | ${tank.volume} m³` : ""}`);
  });

  document.querySelectorAll('select[name="stockId"], select[name="sourceStockId"]').forEach((select) => {
    populateSelect(select, activeStocks(), stockLabel);
  });
}

function renderMetrics() {
  const stocks = activeStocks();
  const totalFish = stocks.reduce((sum, stock) => sum + stock.count, 0);
  const totalBiomass = stocks.reduce((sum, stock) => sum + stock.biomassKg, 0);
  const totalFeed = state.stocks.reduce((sum, stock) => sum + stock.feedKg, 0);
  const totalMortality = state.stocks.reduce((sum, stock) => sum + stock.mortality, 0);
  const harvestedKg = state.harvests.reduce((sum, harvest) => sum + harvest.weightKg, 0);

  els.metrics.innerHTML = [
    ["Aktive Fische", formatInt.format(totalFish), "Stueck in Becken"],
    ["Biomasse", `${formatKg.format(totalBiomass)} kg`, "berechnet"],
    ["Futter", `${formatKg.format(totalFeed)} kg`, "gesamt dokumentiert"],
    ["Mortalitaet", formatInt.format(totalMortality), "entfernte Fische"],
    ["Schlachtgewicht", `${formatKg.format(harvestedKg)} kg`, "entnommen"]
  ]
    .map(([label, value, helper]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><span>${helper}</span></article>`)
    .join("");
}

function renderStockRows() {
  const stocks = activeStocks().sort((a, b) => (tankById(a.tankId)?.name || "").localeCompare(tankById(b.tankId)?.name || ""));

  if (stocks.length === 0) {
    els.stockRows.innerHTML = `<tr><td colspan="9" class="empty">Keine aktiven Bestaende vorhanden.</td></tr>`;
    return;
  }

  els.stockRows.innerHTML = stocks
    .map((stock) => {
      const batch = batchById(stock.batchId);
      const tank = tankById(stock.tankId);
      const avg = averageWeightG(stock);
      const target = targetWeightFor(stock);
      const mortalityRate = stock.initialCount > 0 ? (stock.mortality / stock.initialCount) * 100 : 0;

      return `
        <tr>
          <td><strong>${tank?.name || "Unbekannt"}</strong><span class="muted">${tank?.note || ""}</span></td>
          <td><strong>${batch?.supplier || "Unbekannt"}</strong><span class="muted">${batch?.date || ""}</span></td>
          <td>${formatInt.format(stock.count)}</td>
          <td><span class="pill">${formatG.format(avg)} g</span><span class="muted">Start: ${formatG.format(stock.initialAvgWeightG)} g</span></td>
          <td>${formatKg.format(stock.biomassKg)} kg</td>
          <td>${formatKg.format(stock.feedKg)} kg</td>
          <td>${formatInt.format(stock.mortality)} <span class="muted">(${mortalityRate.toFixed(1)} %)</span></td>
          <td>${formatG.format(target)} g <span class="muted">${target >= 1500 ? "Schlachtung" : "Sortierung"}</span></td>
          <td>${formatKg.format(feedNeededKg(stock, target))} kg</td>
        </tr>
      `;
    })
    .join("");
}

function renderTimeline() {
  const events = [
    ...state.feedings.map((feeding) => ({
      date: feeding.date,
      type: `Fuetterung ${feeding.slot}`,
      text: `${stockLabelForHistory(feeding.stockId)}: ${formatKg.format(feeding.feedKg)} kg Futter, ${formatInt.format(feeding.deadCount)} tote Fische`
    })),
    ...state.sortings.map((sorting) => ({
      date: sorting.date,
      type: "Sortierung",
      text: `${sorting.sourceLabel}: ${formatInt.format(sorting.totalCount)} Fische auf ${sorting.targets.length} Becken verteilt`
    })),
    ...state.harvests.map((harvest) => ({
      date: harvest.date,
      type: "Schlachtung",
      text: `${harvest.stockLabel}: ${formatInt.format(harvest.count)} Fische, ${formatKg.format(harvest.weightKg)} kg`
    }))
  ].sort((a, b) => `${b.date}${b.type}`.localeCompare(`${a.date}${a.type}`));

  if (events.length === 0) {
    els.timeline.innerHTML = `<div class="empty">Noch keine Ereignisse dokumentiert.</div>`;
    return;
  }

  els.timeline.innerHTML = events
    .slice(0, 14)
    .map((event) => `<article class="event"><strong>${event.date} | ${event.type}</strong><span>${event.text}</span></article>`)
    .join("");
}

function stockLabelForHistory(stockId) {
  const stock = stockById(stockId);
  return stock ? stockLabel(stock) : "Geschlossener Bestand";
}

function setDefaultDates() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today();
  });
}

function render() {
  renderSplitTargets();
  updateSelects();
  renderMetrics();
  renderStockRows();
  renderTimeline();
  setDefaultDates();
  saveState();
}

function assertCapacity(stock, count, message) {
  if (count > stock.count) throw new Error(`${message}: maximal ${stock.count} Fische verfuegbar.`);
}

function closeIfEmpty(stock, date) {
  if (stock.count <= 0) {
    stock.count = 0;
    stock.biomassKg = 0;
    stock.closedAt = date;
  }
}

forms.batch.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.batch);
  state.batches.push({
    id: uid("batch"),
    supplier: data.get("supplier").trim(),
    date: data.get("date"),
    count: Math.round(number(data.get("count"))),
    avgWeightG: number(data.get("avgWeight")),
    feedConversion: number(data.get("feedConversion"), 1),
    createdAt: new Date().toISOString()
  });
  forms.batch.reset();
  render();
});

forms.tank.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.tank);
  state.tanks.push({
    id: uid("tank"),
    name: data.get("name").trim(),
    volume: number(data.get("volume")),
    note: data.get("note").trim(),
    createdAt: new Date().toISOString()
  });
  forms.tank.reset();
  render();
});

forms.stocking.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.stocking);
  state.stocks.push(createStock({
    batchId: data.get("batchId"),
    tankId: data.get("tankId"),
    count: data.get("count"),
    avgWeightG: data.get("avgWeight"),
    date: data.get("date"),
    origin: "Erstbesatz"
  }));
  forms.stocking.reset();
  render();
});

forms.feeding.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.feeding);
  const stock = stockById(data.get("stockId"));
  if (!stock) return;

  const deadCount = Math.max(0, Math.round(number(data.get("deadCount"))));
  const feedKg = Math.max(0, number(data.get("feedKg")));
  const date = data.get("date");

  try {
    assertCapacity(stock, deadCount, "Mortalitaet");
  } catch (error) {
    alert(error.message);
    return;
  }

  const avgBeforeFeeding = averageWeightG(stock);
  stock.count -= deadCount;
  stock.biomassKg = Math.max(0, stock.biomassKg - (deadCount * avgBeforeFeeding) / 1000);
  stock.biomassKg += feedKg * feedConversion(stock);
  stock.feedKg += feedKg;
  stock.mortality += deadCount;
  closeIfEmpty(stock, date);

  state.feedings.push({
    id: uid("feeding"),
    stockId: stock.id,
    date,
    slot: data.get("slot"),
    feedKg,
    deadCount,
    avgWeightGBefore: avgBeforeFeeding,
    createdAt: new Date().toISOString()
  });

  forms.feeding.reset();
  render();
});

forms.sorting.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.sorting);
  const source = stockById(data.get("sourceStockId"));
  if (!source) return;

  const date = data.get("date");
  const targets = [...els.splitTargets.querySelectorAll(".split-target")]
    .map((fieldset) => ({
      tankId: fieldset.querySelector('[name="targetTankId"]').value,
      count: Math.round(number(fieldset.querySelector('[name="targetCount"]').value)),
      avgWeightG: number(fieldset.querySelector('[name="targetAvgWeight"]').value)
    }))
    .filter((target) => target.tankId && target.count > 0 && target.avgWeightG > 0);

  const totalCount = targets.reduce((sum, target) => sum + target.count, 0);
  if (targets.length === 0) {
    alert("Mindestens ein Zielbecken mit Stueckzahl und Durchschnittsgewicht ist erforderlich.");
    return;
  }

  try {
    assertCapacity(source, totalCount, "Sortierung");
  } catch (error) {
    alert(error.message);
    return;
  }

  const sourceLabelBefore = stockLabel(source);
  const sourceAvg = averageWeightG(source);
  source.count -= totalCount;
  source.transferredOut += totalCount;
  source.biomassKg = Math.max(0, source.biomassKg - (totalCount * sourceAvg) / 1000);
  closeIfEmpty(source, date);

  const newStocks = targets.map((target) => createStock({
    batchId: source.batchId,
    tankId: target.tankId,
    count: target.count,
    avgWeightG: target.avgWeightG,
    date,
    origin: "Sortierung",
    parentStockId: source.id
  }));

  state.stocks.push(...newStocks);
  state.sortings.push({
    id: uid("sorting"),
    sourceStockId: source.id,
    sourceLabel: sourceLabelBefore,
    date,
    totalCount,
    sourceAvgWeightG: sourceAvg,
    targets: newStocks.map((stock) => ({
      stockId: stock.id,
      tankId: stock.tankId,
      count: stock.count,
      avgWeightG: stock.initialAvgWeightG
    })),
    createdAt: new Date().toISOString()
  });

  forms.sorting.reset();
  els.splitTargets.innerHTML = "";
  render();
});

forms.harvest.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.harvest);
  const stock = stockById(data.get("stockId"));
  if (!stock) return;

  const count = Math.round(number(data.get("count")));
  const date = data.get("date");
  const avgWeightG = number(data.get("avgWeight"), averageWeightG(stock)) || averageWeightG(stock);

  try {
    assertCapacity(stock, count, "Schlachtung");
  } catch (error) {
    alert(error.message);
    return;
  }

  const stockLabelBefore = stockLabel(stock);
  const proportionalBiomassKg = stock.count > 0 ? stock.biomassKg * (count / stock.count) : 0;
  const slaughterWeightKg = (count * avgWeightG) / 1000;
  stock.count -= count;
  stock.harvestedCount += count;
  stock.biomassKg = Math.max(0, stock.biomassKg - proportionalBiomassKg);
  closeIfEmpty(stock, date);

  state.harvests.push({
    id: uid("harvest"),
    stockId: stock.id,
    stockLabel: stockLabelBefore,
    date,
    count,
    avgWeightG,
    weightKg: slaughterWeightKg,
    createdAt: new Date().toISOString()
  });

  forms.harvest.reset();
  render();
});

forms.target.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.target);
  const stock = stockById(data.get("stockId"));
  const targetWeight = number(data.get("targetWeight"));
  if (!stock || targetWeight <= 0) return;

  const needed = feedNeededKg(stock, targetWeight);
  const currentAvg = averageWeightG(stock);
  const targetBiomass = (stock.count * targetWeight) / 1000;
  els.targetResult.innerHTML = `
    <strong>${stockLabel(stock)}</strong><br />
    Aktuell: ${formatG.format(currentAvg)} g Ø, ${formatKg.format(stock.biomassKg)} kg Biomasse.<br />
    Ziel: ${formatG.format(targetWeight)} g Ø, ${formatKg.format(targetBiomass)} kg Biomasse.<br />
    Erforderliches Futter bei Codex ${feedConversion(stock)}:1: <strong>${formatKg.format(needed)} kg</strong>.
  `;
});

els.exportData.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fischfuetterung-export-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

els.importData.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    state = { ...emptyState(), ...JSON.parse(await file.text()) };
    render();
  } catch {
    alert("Import fehlgeschlagen. Die Datei ist kein gueltiger JSON-Export.");
  } finally {
    event.target.value = "";
  }
});

els.resetData.addEventListener("click", () => {
  if (!confirm("Alle lokalen Daten zuruecksetzen?")) return;
  state = seedState();
  render();
});

render();
