import { createBarChart } from './bar-chart.js';
import { init } from './crossfilter.js';
import { createDropdown } from './dropdown.js';
const hightlightFactor = 2;
const height = 2000;
const width = 2000;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

let connections;
let filterData;
let nodes;

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

  createBarChart('Start year', 'year-group', cf.yearGroup, (from, to) => {
    draw(cf.filterYear(from, to));
  });

  createBarChart('Duration (in years)', 'duration-group', cf.durationGroup, (from, to) => {
    draw(cf.filterDuration(from, to));
  });

  createDropdown('Institution', 'institution', cf.institutionLabels, val => {
    draw(cf.filterInstitution(val));
  });

  createDropdown('Subject', 'subject', cf.subjectLabels, val => {
    draw(cf.filterSubject(val));
  });

  createDropdown('Person', 'person', cf.personLabels, val => {
    draw(cf.filterPerson(val));
  });
}

async function setup() {
  const root = d3.select('body')
    .append('div')
      .attr('style', 'display: flex; flex-direction: column; height: 100%;')
  root.append('div')
    .attr('class', 'filters')
    .attr('style', 'width: 300px;');

  const forceDirectedGraph = root
  .append('div')
  .attr('class', 'splitLayout')
  .attr('style', 'display: flex; flex: auto;')
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

  forceDirectedGraph.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.25, 10])
    .on('zoom', () => {
      networkGroup.attr('transform', d3.event.transform);
    })
  );

  //detail text selected node
  const details = d3.select('body .splitLayout').append('div')
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

  details
    .append('div')
    .attr('class', 'projectDetails')
    .append('div')
    .attr('class', 'title')
    .text('Projects');
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

  d3.select('.projectDetails')
    .selectAll('.projects')
    .data(nodeData.projects)
    .join("div")
      .attr('class', 'projects')
      .attr("width", 100)
      .attr("height", 100)
      .text(d => d.title);
}

function getDetails(nodeData) {
  const projectIds = connections
    .filter(connection => connection.person_id === nodeData.person_id)
    .map(connection => connection.project_id_number);
  const projects = filterData
    .filter(d => projectIds.includes(d.project_id_number))
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

  return { person_name: nodeData.person_name, institution_name: nodeData.institution_name, projects }
}

async function draw(data) {
  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));

  console.log('links', links);
  console.log('nodes', nodes);

  let colorBeforeHighlight;
  const nodeRadius = 5;;

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.person_id))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(width / 2, height / 2));

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
      .attr('fill', d => colorScale(d.institution_name))
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

  const bBox = d3.select('.network').node().getBBox();
  // x0,y0--x1,y0--x2,y0
  //   |      |      |
  // x0,y1--x1,y1--x2,y1
  //   |      |      |
  // x0,y2--x1,y2--x2,y2
  const x0 = bBox.x;
  const x1 = x0 + bBox.width / 2
  const x2 = x0 + bBox.width;
  const y0 = bBox.y;
  const y1 = y0 + bBox.height / 2
  const y2 = y0 + bBox.height;

  const leftPoint = simulation.find(x0, y1);
  const rightPoint = simulation.find(x2, y1);
  const topPoint = simulation.find(x1, y0);
  const bottomPoint = simulation.find(x1, y2);
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

function drawRelatedTo(personId) {
  const personIds = getPersonIdsRelatedTo([personId]);
  const nodes = dataNetwork.nodes.filter(n => personIds.includes(n.person_id));
  const links = dataNetwork.links.filter(l => personIds.includes(l.source.person_id) && personIds.includes(l.target.person_id));

  //console.log(personIds, nodes, links);
  draw(links, nodes);
}

function getPersonIdsRelatedTo(roots, depth = 5) {
  const newRoots = dataNetwork.links.filter(l => roots.includes(l.source.person_id) || roots.includes(l.target.person_id));
  if (depth) {
    return getPersonIdsRelatedTo(uniquePersonIdList(newRoots, roots), depth - 1);
  }
  return uniquePersonIdList(newRoots, roots);
}

function uniquePersonIdList(linkList, initialList = []) {
  return linkList.reduce((r, l) => {
    if (!r.includes(l.source.person_id)) {
      r = [...r, l.source.person_id];
    }
    if (!r.includes(l.target.person_id)) {
      r = [...r, l.target.person_id];
    }
    return r;
  }, initialList);
}

main();
