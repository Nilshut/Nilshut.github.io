import { createBarChart } from './bar-chart.js';
import { init } from './crossfilter.js';
import { createDropdown } from './dropdown.js';
const hightlightFactor = 2;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
let colorDimension = 'institution_name';
let zoom;

let connections;
let filterData;
let nodes;
const redrawFilterFns = {};

function loadNodes() {
  return d3.csv('data/nodes.csv', d3.autoType);
}

function loadFilterData() {
  return d3.csv('data/filtered_data.csv', row => {
    row = d3.autoType(row);
    if (typeof row.person_ids === 'string') {
      row.person_ids = d3.autoType(row.person_ids.split(','));
    } else {
      row.person_ids = [row.person_ids];
    }

    return row;
  });
}

function loadConnections() {
  return d3.csv('data/filtered_persons_projects.csv', d3.autoType);
}

export async function main() {
  nodes = await loadNodes();
  connections = await loadConnections();
  filterData = await loadFilterData();

  const cf = init(filterData, connections, nodes);

  setup();

  redrawFilterFns['year'] = createBarChart('Start year', 'year', cf.yearDim, (from, to) => {
    draw(cf.filterRange(cf.yearDim)(from, to), 'year');
  });

  redrawFilterFns['duration'] = createBarChart('Duration (in years)', 'duration', cf.durationDim, (from, to) => {
    draw(cf.filterRange(cf.durationDim)(from, to), 'duration');
  });

  redrawFilterFns['institution'] = createDropdown('Institution', 'institution', cf.institutionDim, cf.institutionLabels, val => {
    draw(cf.filterExact(cf.institutionDim)(val), 'institution');
  });

  redrawFilterFns['subject'] = createDropdown('Subject', 'subject', cf.subjectDim, cf.subjectLabels, val => {
    draw(cf.filterExact(cf.subjectDim)(val), 'subject');
  });

  redrawFilterFns['person'] = createDropdown('Person', 'person', cf.personDim, cf.personLabels, val => {
    draw(cf.filterExact(cf.personDim)(val), 'person');
  });

  createColorToggle(cf);
}

async function setup() {
  const root = d3.select('body')
    .append('div')
      .attr('style', 'display: flex; flex-direction: column; height: 100%;');

  root.append('div')
    .attr('class', 'filters')
    .attr('style', 'width: 300px;');

  root.append('div').text('Switch color dimension');
  root.append('div').attr('class', 'switch-group');

  root
    .append('div')
      .attr('class', 'too-much-data')
      .attr('style', 'outline: thin solid black; flex: auto;')
      .text('Too much data, filter your data first.');

  const splitLayout = root
    .append('div')
    .attr('class', 'splitLayout')
    .attr('style', 'display: none;');

  const forceDirectedGraph = splitLayout
    .append('svg')
      .attr('class', 'network')
      .attr('style', 'outline: thin solid black; flex: auto;');

  const networkGroup = forceDirectedGraph.append('g');

  networkGroup.append('g')
    .attr('class', 'links')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6);

  networkGroup.append('g')
    .attr('class', 'nodes')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  zoom = d3.zoom()
    // .extent([[0, 0], [width, height]])
    // .scaleExtent([0.5, 2])
    .on('zoom', () => {
      networkGroup.attr('transform', d3.event.transform);
    });

  forceDirectedGraph.call(zoom);

  const details = splitLayout.append('div')
    .attr('class', 'details')
    .attr('style', 'background-color:lightgrey; outline: thin solid black; width: 400px; height: 100%;')

  details
    .append('div')
    .attr('class', 'personDetails')
    .append('div')
    .attr('class', 'title')
    .text('Name');

  details
    .append('div')
    .attr('class', 'institutionDetails')
    .append('div')
    .attr('class', 'title')
    .text('Institution');

  const projectDetails = details
    .append('div')
    .attr('class', 'projectDetails');
  projectDetails.append('div')
    .attr('class', 'title')
    .text('Projects');
  projectDetails.append('ul')
  .attr('class', 'projectList');
}

async function showDetails(data) {
  const nodeData = getDetails(data);

  d3.select('.personDetails')
    .selectAll('.personNameField')
    .data([nodeData])
    .join("div")
      .attr('class', 'personNameField')
      .attr("width", 100)
      .attr("height", 100)
      .text(d => d.person_name);

  d3.select('.institutionDetails')
    .selectAll('.institutionNameField')
    .data([nodeData])
    .join("div")
      .attr('class', 'institutionNameField')
      .attr("width", 100)
      .attr("height", 100)
      .text(d => d.institution_name);

  const project = d3.select('.projectDetails .projectList')
    .selectAll('.project')
    .data(nodeData.projects)
    .join("li")
      .attr('class', 'project');
  project
    .selectAll('.title')
    .data(d => [d])
    .join('span')
    .attr('class', 'title')
    .text(d => d.title);
  project
    .selectAll('.time-frame')
    .data(d => [d])
    .join('span')
    .attr('class', 'time-frame')
    .text(d => `(${ d.funding_start_year || '' } - ${ d.funding_end_year || '' })`);
  project
    .selectAll('.subject')
    .data(d => [d])
    .join('span')
    .attr('class', 'subject')
    .text(d => d.subject || '');
  project
    .selectAll('.institutions')
    .data(d => [d])
    .join('ul')
    .attr('class', 'institutions')
    .text('Institutions')
    .selectAll('.institution')
    .data(d => d.institutions.filter(d => d))
    .join('li')
      .text(d => d.institution_name);

}

function getDetails(nodeData) {
  const projectIds = connections
    .filter(connection => connection.person_id === nodeData.person_id)
    .map(connection => connection.project_id_number);
  const relevantFilterData = filterData.filter(d => projectIds.includes(d.project_id_number));
  const projects = relevantFilterData
    .reduce((projectData, project) => {
      let dataForCurrentProject = projectData.find(d => d.project_id_number === project.project_id_number);
      if (!dataForCurrentProject) {
        projectData.push(project);
        dataForCurrentProject = projectData[projectData.length - 1];
        dataForCurrentProject.institutions = [];
      }
      dataForCurrentProject.institutions.push({ institution_name: project.institution_name });
      return projectData;
    }, []);

  return {
    person_name: nodeData.person_name,
    institution_name: nodeData.institution_name,
    projects
  }
}

// data is undefined if there is too much data
async function draw(data, skipFilterRedraw) {
  Object.entries(redrawFilterFns).forEach(([key, redraw]) => key === skipFilterRedraw ? undefined : redraw());

  if (data) {
    d3.select('.too-much-data').attr('style', 'display: none;');
    d3.select('.splitLayout').attr('style', 'display: flex; flex: auto;');
  } else {
    d3.select('.too-much-data').attr('style', 'outline: thin solid black; flex: auto;');
    d3.select('.splitLayout').attr('style', 'display: none;');
    return;
  }

  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));

  console.log('links', links);
  console.log('nodes', nodes);

  let colorBeforeHighlight;
  const nodeRadius = 10;
  const outerClientRect = d3.select('.network').node().getClientRects()[0];

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).distance(200).id(d => d.person_id))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(outerClientRect.width / 2, outerClientRect.height / 2));

  const link = d3.select('g.links')
    .selectAll('line')
    .data(links)
    .join('line')
      .attr('stroke-width', d => Math.sqrt(d.value));

  const node = d3.select('g.nodes')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
      .attr('r', nodeRadius)
      .attr('fill', d => colorScale(d[colorDimension]))
      .call(drag(simulation))
      .on("mouseover", function (d) {
        colorBeforeHighlight = d3.select(this).attr("fill");
        d3.select(this)
          .attr("fill", "red")
          .attr("r", hightlightFactor * nodeRadius);
        showDetails(d);
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("fill", colorBeforeHighlight)
          .attr("r", nodeRadius);
      });

  node.append('title').text(d => d.person_name);

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  });
}

function drag(simulation) {
  return d3.drag()
    .on('start', d => {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', d => {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    })
    .on('end', d => {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

function createColorToggle(cf) {
  const colorToggleGroup = d3.select('.switch-group');
  colorToggleGroup.append('span').attr('class', 'switch-label').text('Institutions');
  const colorToggle = colorToggleGroup.append('label').attr('class', 'switch');
  colorToggle.append('input').attr('type', 'checkbox');
  const slider = colorToggle.append('span').attr('class', 'slider');
  slider.on('click', () => {
    colorDimension = colorDimension === 'institution_name' ? 'subject' : 'institution_name';
    draw(cf.getFilteredData());
  });
  colorToggleGroup.append('span').attr('class', 'switch-label').text('Subjects');
}

main();
