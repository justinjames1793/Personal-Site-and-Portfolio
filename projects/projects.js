import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Projects list ---
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const title = document.querySelector('.projects-title');
title.textContent = `${projects.length} Projects`;

// Filter state ---
// Both filters live here, so every update can apply BOTH of them.
let query = '';           // what's typed in the search box
let selectedYear = null;  // year of the selected wedge, e.g. '2025'; null = none
                          // (stored as a year, not an index, because wedge
                          //  positions change when the search changes the pie)

// Does a project match the search query? (searches every field, ignores case)
function matchesQuery(project) {
  let values = Object.values(project).join('\n').toLowerCase();
  return values.includes(query.toLowerCase());
}

// Pie chart + legend ---

// These don't depend on the data, so they're created once
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Draw the pie chart and legend for whatever projects it's given
function renderPieChart(projectsGiven) {
  // re-calculate rolled data: [['2026', 9], ['2025', 3], ...]
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // re-calculate data: [{value: 9, label: '2026'}, ...]
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // re-calculate slice generator, arc data, arcs
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  // which wedge shows the selected year in THIS version of the pie (-1 = none)
  let selectedIndex = newData.findIndex((d) => d.label === selectedYear);

  // clear old paths and legend items so they don't stack up
  let newSVG = d3.select('#projects-pie-plot');
  newSVG.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // draw wedges; clicking one selects/deselects its year
  newArcs.forEach((arc, i) => {
    newSVG
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : null)
      .on('click', () => {
        // clicking the selected year deselects it; otherwise select this year
        let year = newData[i].label;
        selectedYear = selectedYear === year ? null : year;
        updatePage();
      });
  });

  // draw legend items, highlighting the selected one
  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', idx === selectedIndex ? 'legend-item selected' : 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// Apply BOTH filters and redraw everything ---
function updatePage() {
  // 1. search filter
  let searchedProjects = projects.filter(matchesQuery);

  // if the selected year has no projects left after searching, drop the selection
  // (otherwise you'd see an empty list with nothing highlighted to explain why)
  if (selectedYear !== null && !searchedProjects.some((p) => p.year === selectedYear)) {
    selectedYear = null;
  }

  // 2. year filter, applied ON TOP of the search results
  let visibleProjects =
    selectedYear === null
      ? searchedProjects
      : searchedProjects.filter((p) => p.year === selectedYear);

  // project cards show both filters combined
  renderProjects(visibleProjects, projectsContainer, 'h2');

  // pie shows the search results (not year-filtered), so you can still
  // see and click the other years
  renderPieChart(searchedProjects);
}

// Draw everything on page load
updatePage();

// Search ---
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updatePage();
});