const grid = document.querySelector('#metric-grid');
for (const metric of window.PORTFOLIO_METRICS) {
  const item = document.createElement('article'); item.className = 'metric';
  item.innerHTML = `<strong>${metric.value}</strong><b>${metric.label}</b><small>${metric.source}</small>`;
  grid.append(item);
}
