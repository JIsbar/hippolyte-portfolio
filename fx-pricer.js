const DATA_URL = "fx-market-data.json";
const MAX_LEGS = 5;

const elements = {
  pair: document.querySelector("#pair-select"),
  tenor: document.querySelector("#tenor-select"),
  spot: document.querySelector("#spot-input"),
  forward: document.querySelector("#forward-input"),
  vol: document.querySelector("#vol-input"),
  premiumCurrency: document.querySelector("#premium-currency"),
  marketNote: document.querySelector("#market-note"),
  legs: document.querySelector("#legs-container"),
  template: document.querySelector("#leg-template"),
  addLeg: document.querySelector("#add-leg"),
  removeLeg: document.querySelector("#remove-leg"),
  price: document.querySelector("#price-button"),
  reset: document.querySelector("#reset-button"),
  error: document.querySelector("#app-error"),
  dataDate: document.querySelector("#data-date"),
  status: document.querySelector("#result-status"),
  totalPremium: document.querySelector("#total-premium"),
  totalDelta: document.querySelector("#total-delta"),
  totalDeltaNotional: document.querySelector("#total-delta-notional"),
  totalVega: document.querySelector("#total-vega"),
  breakdown: document.querySelector("#breakdown-body"),
  chart: document.querySelector("#pnl-chart"),
  chartEmpty: document.querySelector("#chart-empty"),
  chartDescription: document.querySelector("#chart-description"),
};

let marketData;
let legCount = 0;
let latestChart = null;

function clean(value) {
  return String(value ?? "").trim().toUpperCase();
}

function pipFactor(pair) {
  return pair.endsWith("JPY") ? 0.01 : 0.0001;
}

function yearFraction(tenor) {
  const value = clean(tenor);
  if (["ON", "TN", "SN", "1D"].includes(value)) return 1 / 365;
  if (value.endsWith("D")) return Number(value.slice(0, -1)) / 365;
  if (value.endsWith("W")) return (Number(value.slice(0, -1)) * 7) / 365;
  if (value.endsWith("M")) return Number(value.slice(0, -1)) / 12;
  if (value.endsWith("Y")) return Number(value.slice(0, -1));
  throw new Error(`Unsupported tenor: ${tenor}`);
}

function parseNotional(value) {
  const text = String(value).trim().toLowerCase().replaceAll(",", "");
  const match = text.match(/^([+-]?\d*\.?\d+)\s*([a-z]*)$/);
  if (!match) throw new Error(`Invalid notional: ${value}`);
  const multiplier = { "": 1, k: 1e3, m: 1e6, mm: 1e6, mn: 1e6, b: 1e9, bn: 1e9 }[match[2]];
  if (!multiplier) throw new Error("Use a numeric notional with k, m or bn.");
  const result = Number(match[1]) * multiplier;
  if (!(result > 0)) throw new Error("Notional must be positive.");
  return result;
}

function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z));
  return 0.5 * (1 + sign * erf);
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function numberFormat(value, digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function compactFormat(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function strikeDigits(pair) {
  return pair.endsWith("JPY") ? 3 : 5;
}

function sharedTenors(pair) {
  const forwards = new Set(Object.keys(marketData.forwards[pair] || {}));
  return Object.keys(marketData.vols[pair] || {})
    .filter((tenor) => forwards.has(tenor))
    .sort((a, b) => yearFraction(a) - yearFraction(b));
}

function currentMarket() {
  const pair = clean(elements.pair.value);
  const tenor = clean(elements.tenor.value);
  const convention = marketData.conventions[pair];
  return {
    pair,
    tenor,
    spot: Number(elements.spot.value),
    forward: Number(elements.forward.value),
    vol: Number(elements.vol.value),
    T: yearFraction(tenor),
    convention,
  };
}

function setSelectOptions(select, values, preferred) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  if (values.includes(preferred)) select.value = preferred;
}

function updateMarketInputs(resetOverrides = true) {
  const pair = clean(elements.pair.value);
  const tenors = sharedTenors(pair);
  const previousTenor = clean(elements.tenor.value);
  setSelectOptions(elements.tenor, tenors, tenors.includes(previousTenor) ? previousTenor : "1M");

  const tenor = clean(elements.tenor.value);
  const spot = marketData.spots[pair].mid;
  const points = marketData.forwards[pair][tenor];
  const forward = spot + points * pipFactor(pair);
  const vol = marketData.vols[pair][tenor].atm;
  const convention = marketData.conventions[pair];
  const digits = strikeDigits(pair);

  if (resetOverrides) {
    elements.spot.value = spot.toFixed(digits);
    elements.forward.value = forward.toFixed(digits);
    elements.vol.value = vol.toFixed(3);
  }

  elements.premiumCurrency.textContent = convention.premiumCurrency;
  elements.marketNote.textContent = `${convention.deltaConvention}; ${convention.atmDefinition}. Forward points and ATM volatility are loaded from the static snapshot.`;
  syncAtmfStrikes();
  clearResults();
}

function configureLeg(panel) {
  const product = panel.querySelector('[data-field="product"]');
  const atmf = panel.querySelector('[data-field="atmf"]');
  const strike1 = panel.querySelector('[data-field="strike1"]');
  const strike2 = panel.querySelector('[data-field="strike2"]');
  const strikeTwoField = panel.querySelector("[data-strike-two]");

  const update = () => {
    const isStrangle = product.value === "STRANGLE";
    strikeTwoField.hidden = !isStrangle;
    if (atmf.checked) {
      const forward = Number(elements.forward.value);
      const digits = strikeDigits(elements.pair.value);
      strike1.value = forward.toFixed(digits);
      strike1.disabled = true;
      strike2.value = (forward * 1.01).toFixed(digits);
      strike2.disabled = !isStrangle;
      if (isStrangle) strike1.value = (forward * 0.99).toFixed(digits);
    } else {
      strike1.disabled = false;
      strike2.disabled = !isStrangle;
    }
    clearResults();
  };

  product.addEventListener("change", update);
  atmf.addEventListener("change", update);
  panel.querySelectorAll("input, select").forEach((field) => field.addEventListener("input", clearResults));
  update();
}

function addLeg() {
  if (legCount >= MAX_LEGS) return;
  legCount += 1;
  const fragment = elements.template.content.cloneNode(true);
  const panel = fragment.querySelector(".leg-panel");
  panel.dataset.leg = String(legCount);
  panel.querySelector(".leg-number").textContent = String(legCount);
  elements.legs.append(fragment);
  configureLeg(elements.legs.lastElementChild);
  updateLegButtons();
}

function removeLeg() {
  if (legCount <= 1) return;
  elements.legs.lastElementChild.remove();
  legCount -= 1;
  updateLegButtons();
  clearResults();
}

function updateLegButtons() {
  elements.addLeg.disabled = legCount >= MAX_LEGS;
  elements.removeLeg.disabled = legCount <= 1;
}

function syncAtmfStrikes() {
  elements.legs.querySelectorAll(".leg-panel").forEach((panel) => {
    const atmf = panel.querySelector('[data-field="atmf"]');
    if (!atmf.checked) return;
    const product = panel.querySelector('[data-field="product"]').value;
    const forward = Number(elements.forward.value);
    const digits = strikeDigits(elements.pair.value);
    panel.querySelector('[data-field="strike1"]').value = (product === "STRANGLE" ? forward * 0.99 : forward).toFixed(digits);
    panel.querySelector('[data-field="strike2"]').value = (forward * 1.01).toFixed(digits);
  });
}

function priceSingleOption({ market, type, strike, notional, side }) {
  const { spot, forward, vol: volPercent, T, pair, convention } = market;
  const sigma = volPercent / 100;
  if (![spot, forward, sigma, T, strike, notional].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Spot, forward, volatility, strike, tenor and notional must be positive.");
  }

  const sigmaRootT = sigma * Math.sqrt(T);
  const d1 = (Math.log(forward / strike) + 0.5 * sigma * sigma * T) / sigmaRootT;
  const d2 = d1 - sigmaRootT;
  const isCall = type === "CALL";
  const unitQuote = isCall
    ? forward * normalCdf(d1) - strike * normalCdf(d2)
    : strike * normalCdf(-d2) - forward * normalCdf(-d1);
  const rawDelta = isCall ? normalCdf(d1) : -normalCdf(-d1);
  const vegaQuote = (forward * normalPdf(d1) * Math.sqrt(T)) / 100;
  const sign = side === "BUY" ? 1 : -1;
  const premiumInBase = convention.premiumCurrency === convention.base;
  const unitPremium = premiumInBase ? unitQuote / spot : unitQuote;
  const vegaUnit = premiumInBase ? vegaQuote / spot : vegaQuote;

  return {
    type,
    strike,
    side,
    notional,
    premiumAbs: unitPremium * notional,
    premium: sign * unitPremium * notional,
    delta: sign * rawDelta,
    deltaNotional: sign * rawDelta * notional,
    vega: sign * vegaUnit * notional,
    pair,
    premiumCurrency: convention.premiumCurrency,
  };
}

function priceLeg(panel, market) {
  const side = panel.querySelector('[data-field="side"]').value;
  const product = panel.querySelector('[data-field="product"]').value;
  const notional = parseNotional(panel.querySelector('[data-field="notional"]').value);
  const strike1 = Number(panel.querySelector('[data-field="strike1"]').value);
  const strike2 = Number(panel.querySelector('[data-field="strike2"]').value);
  let definitions;

  if (product === "CALL" || product === "PUT") {
    definitions = [{ type: product, strike: strike1 }];
  } else if (product === "STRADDLE") {
    definitions = [{ type: "CALL", strike: strike1 }, { type: "PUT", strike: strike1 }];
  } else {
    if (!(strike1 < strike2)) throw new Error("For a strangle, Strike 1 must be below Strike 2.");
    definitions = [{ type: "PUT", strike: strike1 }, { type: "CALL", strike: strike2 }];
  }

  return definitions.map((definition) => priceSingleOption({ market, ...definition, notional, side }));
}

function componentExpiryPnl(expirySpot, component, convention) {
  const intrinsicQuote = component.type === "CALL"
    ? Math.max(expirySpot - component.strike, 0)
    : Math.max(component.strike - expirySpot, 0);
  const premiumInBase = convention.premiumCurrency === convention.base;
  const payoff = premiumInBase
    ? (intrinsicQuote / expirySpot) * component.notional
    : intrinsicQuote * component.notional;
  return component.side === "BUY"
    ? payoff - component.premiumAbs
    : component.premiumAbs - payoff;
}

function buildPnlCurve(components, market) {
  const minSpot = market.spot * 0.8;
  const maxSpot = market.spot * 1.2;
  return Array.from({ length: 201 }, (_, index) => {
    const spot = minSpot + (index / 200) * (maxSpot - minSpot);
    const pnl = components.reduce(
      (total, component) => total + componentExpiryPnl(spot, component, market.convention),
      0
    );
    return { spot, pnl };
  });
}

function priceStructure() {
  hideError();
  try {
    const market = currentMarket();
    const panels = [...elements.legs.querySelectorAll(".leg-panel")];
    const components = panels.flatMap((panel) => priceLeg(panel, market));
    const totals = components.reduce(
      (result, item) => ({
        premium: result.premium + item.premium,
        delta: result.delta + item.delta,
        deltaNotional: result.deltaNotional + item.deltaNotional,
        vega: result.vega + item.vega,
      }),
      { premium: 0, delta: 0, deltaNotional: 0, vega: 0 }
    );
    const currency = market.convention.premiumCurrency;

    elements.totalPremium.textContent = `${numberFormat(totals.premium, 2)} ${currency}`;
    elements.totalDelta.textContent = numberFormat(totals.delta, 4);
    elements.totalDeltaNotional.textContent = `${compactFormat(totals.deltaNotional)} ${market.convention.base}`;
    elements.totalVega.textContent = `${numberFormat(totals.vega, 2)} ${currency}`;
    elements.status.textContent = "Priced";
    elements.chartDescription.textContent = `${market.pair} ${market.tenor}; P&L shown in ${currency}.`;

    renderBreakdown(components, currency, market.pair);
    latestChart = { points: buildPnlCurve(components, market), spot: market.spot, currency, pair: market.pair };
    elements.chartEmpty.hidden = true;
    drawChart();
  } catch (error) {
    showError(error.message);
    elements.status.textContent = "Input error";
  }
}

function renderBreakdown(components, currency, pair) {
  elements.breakdown.innerHTML = "";
  const digits = strikeDigits(pair);
  components.forEach((component, index) => {
    const row = document.createElement("tr");
    const values = [
      String(index + 1),
      `${component.side} ${component.type}`,
      numberFormat(component.strike, digits),
      `${numberFormat(component.premium, 2)} ${currency}`,
      numberFormat(component.delta, 4),
      `${numberFormat(component.vega, 2)} ${currency}`,
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    elements.breakdown.append(row);
  });
}

function drawChart() {
  if (!latestChart) return;
  const canvas = elements.chart;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);

  const width = rect.width;
  const height = rect.height;
  const margin = { top: 25, right: 24, bottom: 48, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = latestChart.points;
  const xMin = values[0].spot;
  const xMax = values.at(-1).spot;
  let yMin = Math.min(0, ...values.map((point) => point.pnl));
  let yMax = Math.max(0, ...values.map((point) => point.pnl));
  const yPad = Math.max((yMax - yMin) * 0.12, 1);
  yMin -= yPad;
  yMax += yPad;

  const xScale = (value) => margin.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (value) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.strokeStyle = "#dfe7e5";
  ctx.fillStyle = "#647276";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const xValue = xMin + (i / 4) * (xMax - xMin);
    const x = xScale(xValue);
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, height - margin.bottom);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(numberFormat(xValue, strikeDigits(latestChart.pair)), x, height - 21);

    const yValue = yMin + (i / 4) * (yMax - yMin);
    const y = yScale(yValue);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(compactFormat(yValue), margin.left - 10, y + 4);
  }

  if (yMin < 0 && yMax > 0) {
    ctx.strokeStyle = "#899699";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(margin.left, yScale(0));
    ctx.lineTo(width - margin.right, yScale(0));
    ctx.stroke();
  }

  ctx.strokeStyle = "#7f8d90";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(xScale(latestChart.spot), margin.top);
  ctx.lineTo(xScale(latestChart.spot), height - margin.bottom);
  ctx.stroke();

  ctx.strokeStyle = "#0b6f74";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  values.forEach((point, index) => {
    const x = xScale(point.spot);
    const y = yScale(point.pnl);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#425155";
  ctx.textAlign = "center";
  ctx.fillText("Spot at expiry", margin.left + plotWidth / 2, height - 4);
  ctx.save();
  ctx.translate(15, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`P&L (${latestChart.currency})`, 0, 0);
  ctx.restore();
}

function clearResults() {
  elements.totalPremium.textContent = "-";
  elements.totalDelta.textContent = "-";
  elements.totalDeltaNotional.textContent = "-";
  elements.totalVega.textContent = "-";
  elements.status.textContent = "Ready";
  elements.chartDescription.textContent = "Price the structure to generate its payoff profile.";
  elements.breakdown.innerHTML = '<tr class="empty-row"><td colspan="6">Price the structure to see component analytics.</td></tr>';
  elements.chartEmpty.hidden = false;
  latestChart = null;
  const ctx = elements.chart.getContext("2d");
  ctx.clearRect(0, 0, elements.chart.width, elements.chart.height);
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function hideError() {
  elements.error.hidden = true;
  elements.error.textContent = "";
}

function resetApp() {
  elements.pair.value = marketData.pairs.includes("EURUSD") ? "EURUSD" : marketData.pairs[0];
  elements.legs.innerHTML = "";
  legCount = 0;
  addLeg();
  updateMarketInputs(true);
  hideError();
}

async function initialise() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Unable to load ${DATA_URL}.`);
    marketData = await response.json();
    setSelectOptions(elements.pair, marketData.pairs, "EURUSD");
    elements.dataDate.textContent = `Data snapshot: ${marketData.metadata.snapshot}`;
    addLeg();
    updateMarketInputs(true);

    elements.pair.addEventListener("change", () => updateMarketInputs(true));
    elements.tenor.addEventListener("change", () => updateMarketInputs(true));
    elements.forward.addEventListener("input", () => {
      syncAtmfStrikes();
      clearResults();
    });
    [elements.spot, elements.vol].forEach((field) => field.addEventListener("input", clearResults));
    elements.addLeg.addEventListener("click", addLeg);
    elements.removeLeg.addEventListener("click", removeLeg);
    elements.price.addEventListener("click", priceStructure);
    elements.reset.addEventListener("click", resetApp);
    window.addEventListener("resize", drawChart);
  } catch (error) {
    showError(`${error.message} Open the site through GitHub Pages or a local web server, not directly as a file.`);
    elements.status.textContent = "Data unavailable";
  }
}

initialise();
