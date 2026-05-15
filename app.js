const STORAGE_KEY = "fischfuetterung-state-v1";
const ADMIN_PASSWORD = "1111";
const TANK_TYPES = ["Aufzuchtbecken", "Vorsteckbecken", "Mastbecken", "Haelterbecken"];
const TANK_AREAS = ["Aufzuchtanlage", "Mastanlage"];

const today = () => new Date().toISOString().slice(0, 10);
const uid = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
};
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const escapeAttr = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

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
  target: document.querySelector("#targetForm"),
  correction: document.querySelector("#correctionForm")
};

const els = {
  metrics: document.querySelector("#metrics"),
  stockRows: document.querySelector("#stockRows"),
  timeline: document.querySelector("#timeline"),
  splitTargets: document.querySelector("#splitTargets"),
  splitTargetTemplate: document.querySelector("#splitTargetTemplate"),
  targetResult: document.querySelector("#targetResult"),
  correctionFields: document.querySelector("#correctionFields"),
  exportData: document.querySelector("#exportData"),
  importDataButton: document.querySelector("#importDataButton"),
  importData: document.querySelector("#importData"),
  resetData: document.querySelector("#resetData")
};

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedState();

  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return seedState();
  }
}

function normalizeTankType(tank) {
  if (TANK_TYPES.includes(tank.type)) return tank.type;
  const note = String(tank.note || "").toLowerCase();
  if (note.includes("vorsteck")) return "Vorsteckbecken";
  if (note.includes("mast")) return "Mastbecken";
  if (note.includes("haelter") || note.includes("hälter")) return "Haelterbecken";
  return "Aufzuchtbecken";
}

function normalizeTankArea(tank) {
  if (TANK_AREAS.includes(tank.area)) return tank.area;
  const text = `${tank.name || ""} ${tank.note || ""} ${tank.type || ""}`.toLowerCase();
  if (text.includes("mast")) return "Mastanlage";
  return "Aufzuchtanlage";
}

function normalizeBatchNumber(batch, index) {
  const value = batch.number || batch.batchNumber || batch.chargeNumber;
  if (String(value || "").trim()) return String(value).trim();
  return `CH-${String(index + 1).padStart(3, "0")}`;
}

function normalizeState(candidate) {
  const next = { ...emptyState(), ...(candidate || {}) };

  next.batches = next.batches.map((batch, index) => ({
    ...batch,
    number: normalizeBatchNumber(batch, index),
    supplier: batch.supplier || "",
    count: Math.max(0, Math.round(toNumber(batch.count))),
    avgWeightG: Math.max(0, toNumber(batch.avgWeightG)),
    feedConversion: Math.max(0.1, toNumber(batch.feedConversion, 1))
  }));

  next.tanks = next.tanks.map((tank) => ({
    ...tank,
    area: normalizeTankArea(tank),
    type: normalizeTankType(tank),
    volume: toNumber(tank.volume),
    note: tank.note || ""
  }));

  next.feedings = next.feedings.map((feeding) => {
    const deadCount = Math.max(0, Math.round(toNumber(feeding.deadCount)));
    const avgWeightGBefore = toNumber(feeding.avgWeightGBefore);
    return {
      ...feeding,
      feedKg: Math.max(0, toNumber(feeding.feedKg)),
      deadCount,
      avgWeightGBefore,
      mortalityWeightKg: Math.max(0, toNumber(feeding.mortalityWeightKg, (deadCount * avgWeightGBefore) / 1000))
    };
  });

  next.stocks = next.stocks.map((stock) => {
    const count = Math.max(0, Math.round(toNumber(stock.count)));
    const initialCount = Math.max(0, Math.round(toNumber(stock.initialCount, count)));
    const initialAvgWeightG = Math.max(0, toNumber(stock.initialAvgWeightG));
    const fallbackBiomassKg = (count * initialAvgWeightG) / 1000;
    const fallbackMortalityWeightKg = next.feedings
      .filter((feeding) => feeding.stockId === stock.id)
      .reduce((sum, feeding) => sum + feeding.mortalityWeightKg, 0);

    return {
      ...stock,
      count,
      initialCount,
      initialAvgWeightG,
      biomassKg: Math.max(0, toNumber(stock.biomassKg, fallbackBiomassKg)),
      feedKg: Math.max(0, toNumber(stock.feedKg)),
      mortality: Math.max(0, Math.round(toNumber(stock.mortality))),
      mortalityWeightKg: Math.max(0, toNumber(stock.mortalityWeightKg, fallbackMortalityWeightKg)),
      harvestedCount: Math.max(0, Math.round(toNumber(stock.harvestedCount))),
      transferredOut: Math.max(0, Math.round(toNumber(stock.transferredOut)))
    };
  });

  return next;
}

function seedState() {
  const batchId = uid("batch");
  const tankA = uid("tank");
  const tankB = uid("tank");
  const stockA = uid("stock");
  const stockB = uid("stock");

  return {
    ...emptyState(),
    batches: [
      {
        id: batchId,
        number: "CH-001",
        supplier: "Beispiel Lieferant",
        date: today(),
        count: 4200,
        avgWeightG: 18,
        feedConversion: 1,
        createdAt: new Date().toISOString()
      }
    ],
    tanks: [
      { id: tankA, name: "B-01", area: "Aufzuchtanlage", type: "Aufzuchtbecken", volume: 18, note: "Anzucht", createdAt: new Date().toISOString() },
      { id: tankB, name: "B-02", area: "Aufzuchtanlage", type: "Aufzuchtbecken", volume: 18, note: "Anzucht", createdAt: new Date().toISOString() }
    ],
    stocks: [
      createStock({
        id: stockA,
        batchId,
        tankId: tankA,
        count: 2100,
        avgWeightG: 18,
        date: today(),
        origin: "Erstbesatz"
      }),
      createStock({
        id: stockB,
        batchId,
        tankId: tankB,
        count: 2100,
        avgWeightG: 18,
        date: today(),
        origin: "Erstbesatz"
      })
    ],
    feedings: [],
    sortings: [],
    harvests: []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function confirmAdminPassword(actionLabel) {
  const password = prompt(`${actionLabel}: Passwort eingeben`);
  if (password === null) return false;
  if (password !== ADMIN_PASSWORD) {
    alert("Falsches Passwort.");
    return false;
  }
  return true;
}

function createStock({ id = uid("stock"), batchId, tankId, count, avgWeightG, date, origin, parentStockId = null }) {
  const safeCount = Math.max(0, Math.round(toNumber(count)));
  const safeAvg = Math.max(0, toNumber(avgWeightG));

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
    mortalityWeightKg: 0,
    harvestedCount: 0,
    transferredOut: 0,
    createdAt: date || today(),
    origin,
    parentStockId,
    closedAt: null
  };
}

function batchById(id) {
  return state.batches.find((batch) => batch.id === id);
}

function tankById(id) {
  return state.tanks.find((tank) => tank.id === id);
}

function tankTypeLabel(tank) {
  return tank?.type || "Aufzuchtbecken";
}

function stockById(id) {
  return state.stocks.find((stock) => stock.id === id);
}

function activeStocks() {
  return state.stocks.filter((stock) => stock.count > 0 && !stock.closedAt);
}

function averageWeightG(stock) {
  if (!stock || stock.count <= 0) return 0;
  return (stock.biomassKg * 1000) / stock.count;
}

function feedConversion(stock) {
  return batchById(stock.batchId)?.feedConversion || 1;
}

function targetWeightFor(stock) {
  const avg = averageWeightG(stock);
  if (avg < 300) return 300;
  if (avg < 500) return 500;
  return 1500;
}

function feedNeededKg(stock, targetG = targetWeightFor(stock)) {
  const targetBiomassKg = (stock.count * targetG) / 1000;
  const missingKg = Math.max(0, targetBiomassKg - stock.biomassKg);
  return missingKg / feedConversion(stock);
}

function feedPerDayKg(stock) {
  return 0;
}

function projectedDaysToTarget(stock, targetG = targetWeightFor(stock)) {
  const dailyFeedKg = feedPerDayKg(stock);
  if (!stock || stock.count <= 0 || dailyFeedKg <= 0 || targetG <= averageWeightG(stock)) return 0;
  return Math.ceil(feedNeededKg(stock, targetG) / dailyFeedKg);
}

function sortingDateLabel(stock, targetG = targetWeightFor(stock)) {
  if (!stock || targetG >= 1500) return "-";
  const days = projectedDaysToTarget(stock, targetG);
  if (days <= 0) return "jetzt";
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.toISOString().slice(0, 10)} (${days} Tage)`;
}

function stockLabel(stock) {
  const batch = batchById(stock.batchId);
  const tank = tankById(stock.tankId);
  return `${tank?.name || "Unbekannt"} | ${batchDisplayNumber(batch)} | ${batch?.supplier || "Lieferant unbekannt"} | ${formatInt.format(stock.count)} Stk | ${formatG.format(averageWeightG(stock))} g`;
}

function supplierNames() {
  return [...new Set(state.batches.map((batch) => batch.supplier?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "de-AT"));
}

function batchDisplayNumber(batch) {
  return batch?.number || "Charge unbekannt";
}

function setDefaultDates() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today();
  });
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

  for (let index = 0; index < 6; index += 1) {
    const fragment = els.splitTargetTemplate.content.cloneNode(true);
    fragment.querySelector("legend").textContent = `Zielbecken ${index + 1}`;
    els.splitTargets.append(fragment);
  }
}

function updateSupplierField() {
  const select = forms.batch.elements.supplier;
  const newSupplierField = document.querySelector("#newSupplierField");
  const newSupplierInput = forms.batch.elements.supplierNew;
  const needsNewSupplier = select.value === "__new__";

  newSupplierField.hidden = !needsNewSupplier;
  newSupplierInput.required = needsNewSupplier;
  if (!needsNewSupplier) newSupplierInput.value = "";
}

function updateSelects() {
  const supplierSelect = forms.batch.elements.supplier;
  const currentSupplier = supplierSelect.value;
  supplierSelect.innerHTML = "";

  const blankSupplier = document.createElement("option");
  blankSupplier.value = "";
  blankSupplier.textContent = "Bitte waehlen";
  supplierSelect.append(blankSupplier);

  supplierNames().forEach((supplier) => {
    const option = document.createElement("option");
    option.value = supplier;
    option.textContent = supplier;
    supplierSelect.append(option);
  });

  const newSupplierOption = document.createElement("option");
  newSupplierOption.value = "__new__";
  newSupplierOption.textContent = "Neuen Lieferanten anlegen";
  supplierSelect.append(newSupplierOption);

  if (supplierNames().includes(currentSupplier)) {
    supplierSelect.value = currentSupplier;
  } else if (supplierNames().length === 0) {
    supplierSelect.value = "__new__";
  }
  updateSupplierField();

  document.querySelectorAll('select[name="batchId"]').forEach((select) => {
    populateSelect(
      select,
      state.batches,
      (batch) => `${batchDisplayNumber(batch)} | ${batch.supplier} | ${batch.date} | ${formatInt.format(batch.count)} Stk`
    );
  });

  document.querySelectorAll('select[name="tankId"], select[name="targetTankId"], select[name="correctionTankId"]').forEach((select) => {
    populateSelect(select, state.tanks, (tank) => `${tank.area} | ${tank.name} | ${tankTypeLabel(tank)}${tank.volume ? ` | ${tank.volume} m3` : ""}`);
  });

  document
    .querySelectorAll('select[name="stockId"], select[name="sourceStockId"]')
    .forEach((select) => populateSelect(select, activeStocks(), stockLabel));

  updateCorrectionSelect();
}

function correctionItems(type) {
  if (type === "batch") return state.batches;
  if (type === "tank") return state.tanks;
  if (type === "stock") return activeStocks();
  return [];
}

function correctionLabel(type, item) {
  if (type === "batch") return `${batchDisplayNumber(item)} | ${item.supplier} | ${item.date} | ${formatInt.format(item.count)} Stk`;
  if (type === "tank") return `${item.area} | ${item.name} | ${tankTypeLabel(item)}`;
  return stockLabel(item);
}

function updateCorrectionSelect() {
  if (!forms.correction) return;
  const type = forms.correction.elements.correctionType.value;
  const select = forms.correction.elements.correctionId;
  populateSelect(select, correctionItems(type), (item) => correctionLabel(type, item), "Eintrag waehlen");
  renderCorrectionFields();
}

function renderCorrectionFields() {
  if (!forms.correction || !els.correctionFields) return;
  const type = forms.correction.elements.correctionType.value;
  const id = forms.correction.elements.correctionId.value;
  const item = correctionItems(type).find((candidate) => candidate.id === id);

  if (!item) {
    els.correctionFields.innerHTML = `<div class="empty">Kein Eintrag ausgewaehlt.</div>`;
    return;
  }

  if (type === "batch") {
    els.correctionFields.innerHTML = `
      <label>Chargennummer <input name="correctionNumber" value="${escapeAttr(batchDisplayNumber(item))}" required /></label>
      <label>Lieferant <input name="correctionSupplier" value="${escapeAttr(item.supplier)}" required /></label>
      <label>Lieferdatum <input name="correctionDate" type="date" value="${item.date || today()}" required /></label>
      <label>Stueckzahl <input name="correctionCount" type="number" min="0" step="1" value="${item.count || 0}" required /></label>
      <label>Startgewicht je Fisch (g) <input name="correctionAvgWeight" type="number" min="0" step="0.1" value="${item.avgWeightG || 0}" required /></label>
      <label>Futtercodex <input name="correctionFeedConversion" type="number" min="0.1" step="0.1" value="${item.feedConversion || 1}" required /></label>
    `;
    return;
  }

  if (type === "tank") {
    els.correctionFields.innerHTML = `
      <label>Beckenname <input name="correctionName" value="${escapeAttr(item.name)}" required /></label>
      <label>Anlage/Bereich
        <select name="correctionArea">${TANK_AREAS.map((area) => `<option value="${area}" ${item.area === area ? "selected" : ""}>${area}</option>`).join("")}</select>
      </label>
      <label>Beckentyp
        <select name="correctionTankType">${TANK_TYPES.map((typeName) => `<option value="${typeName}" ${item.type === typeName ? "selected" : ""}>${typeName}</option>`).join("")}</select>
      </label>
      <label>Volumen (m3) <input name="correctionVolume" type="number" min="0" step="0.1" value="${item.volume || 0}" /></label>
      <label>Notiz <input name="correctionNote" value="${escapeAttr(item.note)}" /></label>
    `;
    return;
  }

  const avg = averageWeightG(item);
  els.correctionFields.innerHTML = `
    <label>Becken <select name="correctionTankId" required></select></label>
    <label>Stueckzahl <input name="correctionStockCount" type="number" min="0" step="1" value="${item.count || 0}" required /></label>
    <label>Durchschnittsgewicht (g) <input name="correctionStockAvgWeight" type="number" min="0" step="0.1" value="${avg.toFixed(1)}" required /></label>
    <label>Futter gesamt (kg) <input name="correctionStockFeedKg" type="number" min="0" step="0.01" value="${item.feedKg || 0}" /></label>
    <label>Mortalitaet (Stueck) <input name="correctionStockMortality" type="number" min="0" step="1" value="${item.mortality || 0}" /></label>
    <label>Mortalitaet Gewicht (kg) <input name="correctionStockMortalityKg" type="number" min="0" step="0.01" value="${item.mortalityWeightKg || 0}" /></label>
  `;
  const tankSelect = els.correctionFields.querySelector('[name="correctionTankId"]');
  populateSelect(tankSelect, state.tanks, (tank) => `${tank.area} | ${tank.name} | ${tankTypeLabel(tank)}`);
  tankSelect.value = item.tankId;
}

function renderMetrics() {
  const stocks = activeStocks();
  const totalFish = stocks.reduce((sum, stock) => sum + stock.count, 0);
  const totalBiomass = stocks.reduce((sum, stock) => sum + stock.biomassKg, 0);
  const totalFeed = state.stocks.reduce((sum, stock) => sum + stock.feedKg, 0);
  const totalMortality = state.stocks.reduce((sum, stock) => sum + stock.mortality, 0);
  const totalMortalityWeight = state.stocks.reduce((sum, stock) => sum + stock.mortalityWeightKg, 0);
  const harvestedKg = state.harvests.reduce((sum, harvest) => sum + harvest.weightKg, 0);

  const cards = [
    ["Aktive Fische", formatInt.format(totalFish), "Stueck in Becken"],
    ["Biomasse", `${formatKg.format(totalBiomass)} kg`, "berechnet"],
    ["Futter", `${formatKg.format(totalFeed)} kg`, "gesamt dokumentiert"],
    ["Mortalitaet", formatInt.format(totalMortality), `${formatKg.format(totalMortalityWeight)} kg Verlust`],
    ["Schlachtgewicht", `${formatKg.format(harvestedKg)} kg`, "entnommen"]
  ];

  els.metrics.innerHTML = cards
    .map(([label, value, helper]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><span>${helper}</span></article>`)
    .join("");
}

function renderStockRows() {
  const stocks = activeStocks().sort((a, b) => {
    const tankA = tankById(a.tankId);
    const tankB = tankById(b.tankId);
    return `${tankA?.area || ""}${tankA?.name || ""}`.localeCompare(`${tankB?.area || ""}${tankB?.name || ""}`);
  });

  if (stocks.length === 0) {
    els.stockRows.innerHTML = `<tr><td colspan="10" class="empty">Keine aktiven Bestaende vorhanden.</td></tr>`;
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
          <td><strong>${tank?.name || "Unbekannt"}</strong><span class="muted">${tank?.area || "Aufzuchtanlage"} | ${tankTypeLabel(tank)}${tank?.note ? ` | ${tank.note}` : ""}</span></td>
          <td><strong>${batchDisplayNumber(batch)}</strong><span class="muted">${batch?.supplier || "Lieferant unbekannt"}${batch?.date ? ` | ${batch.date}` : ""}</span></td>
          <td>${formatInt.format(stock.count)}</td>
          <td><span class="pill">${formatG.format(avg)} g</span><span class="muted">Start: ${formatG.format(stock.initialAvgWeightG)} g</span></td>
          <td>${formatKg.format(stock.biomassKg)} kg</td>
          <td>${formatKg.format(stock.feedKg)} kg</td>
          <td>${formatInt.format(stock.mortality)} <span class="muted">(${mortalityRate.toFixed(1)} %, ${formatKg.format(stock.mortalityWeightKg)} kg)</span></td>
          <td>${formatG.format(target)} g <span class="muted">${target >= 1500 ? "Schlachtung" : "Sortierung"}</span></td>
          <td>${sortingDateLabel(stock, target)}</td>
          <td>${formatKg.format(feedPerDayKg(stock))} kg</td>
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
      text: `${stockLabelForHistory(feeding.stockId)}: ${formatKg.format(feeding.feedKg)} kg Futter, ${formatInt.format(feeding.deadCount)} tote Fische (${formatKg.format(feeding.mortalityWeightKg)} kg Verlust)`
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
  if (stock) return stockLabel(stock);
  return "Geschlossener Bestand";
}

function render() {
  state = normalizeState(state);
  renderSplitTargets();
  updateSelects();
  renderMetrics();
  renderStockRows();
  renderTimeline();
  setDefaultDates();
  saveState();
}

function assertCapacity(stock, count, message) {
  if (count > stock.count) {
    throw new Error(`${message}: maximal ${stock.count} Fische verfuegbar.`);
  }
}

function closeIfEmpty(stock, date) {
  if (stock.count <= 0) {
    stock.count = 0;
    stock.biomassKg = 0;
    stock.closedAt = date;
  }
}

function clearEnteredContent() {
  Object.values(forms).forEach((form) => {
    form?.querySelectorAll("input, select").forEach((control) => {
      if (control.type === "number" && control.min === "0") {
        control.value = "0";
        return;
      }
      control.value = "";
    });
  });

  els.splitTargets.innerHTML = "";
  renderSplitTargets();
  updateSelects();
  els.targetResult.textContent = "Noch keine Berechnung.";

  const adviceResult = document.querySelector("#feedingAdviceResult");
  const applyButton = document.querySelector("#applyFeedingAdvice");
  if (adviceResult) adviceResult.textContent = "Noch keine Empfehlung berechnet.";
  if (applyButton) applyButton.disabled = true;
}

forms.batch.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.batch);
  const supplier = data.get("supplier") === "__new__" ? data.get("supplierNew").trim() : data.get("supplier").trim();
  if (!supplier) {
    alert("Bitte Lieferant auswaehlen oder neuen Lieferanten eingeben.");
    return;
  }

  state.batches.push({
    id: uid("batch"),
    number: data.get("number").trim(),
    supplier,
    date: data.get("date"),
    count: Math.round(toNumber(data.get("count"))),
    avgWeightG: toNumber(data.get("avgWeight")),
    feedConversion: toNumber(data.get("feedConversion"), 1),
    createdAt: new Date().toISOString()
  });
  forms.batch.reset();
  render();
});

forms.batch.elements.supplier.addEventListener("change", updateSupplierField);

forms.tank.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.tank);
  state.tanks.push({
    id: uid("tank"),
    name: data.get("name").trim(),
    area: data.get("area"),
    type: data.get("type"),
    volume: toNumber(data.get("volume")),
    note: data.get("note").trim(),
    createdAt: new Date().toISOString()
  });
  forms.tank.reset();
  render();
});

forms.stocking.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.stocking);
  state.stocks.push(
    createStock({
      batchId: data.get("batchId"),
      tankId: data.get("tankId"),
      count: data.get("count"),
      avgWeightG: data.get("avgWeight"),
      date: data.get("date"),
      origin: "Erstbesatz"
    })
  );
  forms.stocking.reset();
  render();
});

forms.feeding.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.feeding);
  const stock = stockById(data.get("stockId"));
  if (!stock) return;

  const deadCount = Math.max(0, Math.round(toNumber(data.get("deadCount"))));
  const feedKg = Math.max(0, toNumber(data.get("feedKg")));
  const date = data.get("date");

  try {
    assertCapacity(stock, deadCount, "Mortalitaet");
  } catch (error) {
    alert(error.message);
    return;
  }

  const avgBeforeFeeding = averageWeightG(stock);
  const mortalityWeightKg = (deadCount * avgBeforeFeeding) / 1000;
  stock.count -= deadCount;
  stock.biomassKg = Math.max(0, stock.biomassKg - mortalityWeightKg);
  stock.biomassKg += feedKg * feedConversion(stock);
  stock.feedKg += feedKg;
  stock.mortality += deadCount;
  stock.mortalityWeightKg += mortalityWeightKg;
  closeIfEmpty(stock, date);

  state.feedings.push({
    id: uid("feeding"),
    stockId: stock.id,
    date,
    slot: data.get("slot"),
    feedKg,
    deadCount,
    avgWeightGBefore: avgBeforeFeeding,
    avgWeightGAfter: averageWeightG(stock),
    mortalityWeightKg,
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
  const targetFields = [...els.splitTargets.querySelectorAll(".split-target")];
  const targets = targetFields
    .map((fieldset) => ({
      tankId: fieldset.querySelector('[name="targetTankId"]').value,
      count: Math.round(toNumber(fieldset.querySelector('[name="targetCount"]').value)),
      avgWeightG: toNumber(fieldset.querySelector('[name="targetAvgWeight"]').value)
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

  const newStocks = targets.map((target) =>
    createStock({
      batchId: source.batchId,
      tankId: target.tankId,
      count: target.count,
      avgWeightG: target.avgWeightG,
      date,
      origin: "Sortierung",
      parentStockId: source.id
    })
  );
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

  const count = Math.round(toNumber(data.get("count")));
  const date = data.get("date");
  const avgWeightG = toNumber(data.get("avgWeight"), averageWeightG(stock)) || averageWeightG(stock);

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

forms.correction?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!confirmAdminPassword("Korrektur")) return;

  const data = new FormData(forms.correction);
  const type = data.get("correctionType");
  const id = data.get("correctionId");

  if (type === "batch") {
    const batch = batchById(id);
    if (!batch) return;
    batch.number = data.get("correctionNumber").trim();
    batch.supplier = data.get("correctionSupplier").trim();
    batch.date = data.get("correctionDate");
    batch.count = Math.max(0, Math.round(toNumber(data.get("correctionCount"))));
    batch.avgWeightG = Math.max(0, toNumber(data.get("correctionAvgWeight")));
    batch.feedConversion = Math.max(0.1, toNumber(data.get("correctionFeedConversion"), 1));
  }

  if (type === "tank") {
    const tank = tankById(id);
    if (!tank) return;
    tank.name = data.get("correctionName").trim();
    tank.area = data.get("correctionArea");
    tank.type = data.get("correctionTankType");
    tank.volume = Math.max(0, toNumber(data.get("correctionVolume")));
    tank.note = data.get("correctionNote").trim();
  }

  if (type === "stock") {
    const stock = stockById(id);
    if (!stock) return;
    const count = Math.max(0, Math.round(toNumber(data.get("correctionStockCount"))));
    const avgWeightG = Math.max(0, toNumber(data.get("correctionStockAvgWeight")));
    stock.tankId = data.get("correctionTankId");
    stock.count = count;
    stock.biomassKg = (count * avgWeightG) / 1000;
    stock.feedKg = Math.max(0, toNumber(data.get("correctionStockFeedKg")));
    stock.mortality = Math.max(0, Math.round(toNumber(data.get("correctionStockMortality"))));
    stock.mortalityWeightKg = Math.max(0, toNumber(data.get("correctionStockMortalityKg")));
    stock.closedAt = count <= 0 ? today() : null;
  }

  render();
});

forms.correction?.elements.correctionType.addEventListener("change", updateCorrectionSelect);
forms.correction?.elements.correctionId.addEventListener("change", renderCorrectionFields);

forms.target.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(forms.target);
  const stock = stockById(data.get("stockId"));
  const targetWeight = toNumber(data.get("targetWeight"));
  if (!stock || targetWeight <= 0) return;

  const needed = feedNeededKg(stock, targetWeight);
  const currentAvg = averageWeightG(stock);
  const targetBiomass = (stock.count * targetWeight) / 1000;
  els.targetResult.innerHTML = `
    <strong>${stockLabel(stock)}</strong><br />
    Tagesaktuell: ${formatG.format(currentAvg)} g Ø, ${formatKg.format(stock.biomassKg)} kg Biomasse.<br />
    Ziel: ${formatG.format(targetWeight)} g Ø, ${formatKg.format(targetBiomass)} kg Biomasse.<br />
    Erforderliches Futter bei Codex ${feedConversion(stock)}:1: <strong>${formatKg.format(needed)} kg</strong>.
  `;
});

els.exportData.addEventListener("click", () => {
  if (!confirmAdminPassword("Export")) return;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fischfuetterung-export-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

let importAuthorized = false;
let importAuthorizationTimer = null;

els.importDataButton?.addEventListener("click", () => {
  if (!confirmAdminPassword("Import")) return;
  clearTimeout(importAuthorizationTimer);
  importAuthorized = true;
  importAuthorizationTimer = setTimeout(() => {
    importAuthorized = false;
  }, 60000);
  els.importData.click();
});

els.importData.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    clearTimeout(importAuthorizationTimer);
    importAuthorized = false;
    return;
  }

  try {
    if (!importAuthorized && !confirmAdminPassword("Import")) return;
    const imported = JSON.parse(await file.text());
    state = normalizeState(imported);
    render();
  } catch {
    alert("Import fehlgeschlagen. Die Datei ist kein gueltiger JSON-Export.");
  } finally {
    clearTimeout(importAuthorizationTimer);
    importAuthorized = false;
    event.target.value = "";
  }
});

els.resetData.addEventListener("click", () => {
  if (!confirmAdminPassword("Zuruecksetzen")) return;
  if (!confirm("Alle lokalen Daten zuruecksetzen?")) return;
  state = emptyState();
  render();
  clearEnteredContent();
});

render();
