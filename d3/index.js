import { createBarChart } from './bar-chart.js';
import { init } from './crossfilter.js';

let r_factor = 2;
const height = 2000;
const width = 2000;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

async function loadDataNetwork() {
  const dataNetwork = {
    nodes: await d3.csv('data/nodes.csv'),
    links: await d3.csv('data/links.csv')
  };

  // dataNetwork.links = dataNetwork.links.filter((l, i) => i < 1000);
  // const nodeNames = dataNetwork.links.reduce((n, l) => {
  //   if (!n.includes(l.source)) {
  //     n = [...n, l.source];
  //   }
  //   if (!n.includes(l.target)) {
  //     n = [...n, l.target];
  //   }
  //   return n;
  // }, []);
  //
  // dataNetwork.nodes = dataNetwork.nodes.filter(n => nodeNames.includes(n.person_id));

  return dataNetwork;
}

function loadDataFilter() {
  return d3.csv('data/filter_data.csv');
}

export async function main() {
  const dataNetwork = await loadDataNetwork();
  const cf = init(await loadDataFilter(), dataNetwork.nodes, dataNetwork.links);

  dataNetwork.links = dataNetwork.links.map(d => Object.create(d));
  dataNetwork.nodes = dataNetwork.nodes.map(d => Object.create(d));

  setup();

  createBarChart('year-group', cf.yearGroup, (from, to) => {
    const filteredData = cf.filterYear(from, to);

    const links = filteredData.links.map(d => Object.create(d));
    const nodes = filteredData.nodes.map(d => Object.create(d));
    draw(links, nodes);
  });

  createBarChart('duration-group', cf.durationGroup, (from, to) => {
    const filteredData = cf.filterDuration(from, to);

    const links = filteredData.links.map(d => Object.create(d));
    const nodes = filteredData.nodes.map(d => Object.create(d));
    draw(links, nodes);
  });

  createBarChart('institution-group', cf.institutionGroup, (from, to) => {
    const filteredData = cf.filterInstitution(from, to);

    const links = filteredData.links.map(d => Object.create(d));
    const nodes = filteredData.nodes.map(d => Object.create(d));
    draw(links, nodes);
  });

  //draw(dataNetwork.links, dataNetwork.nodes);
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
      .attr('style', 'outline: thin solid black; flex: auto;');

  const networkGroup = forceDirectedGraph.append('g').attr('class', 'network');

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
      networkGroup.attr('transform', d3.event.transform)
    })
  );

  //detail text selected node
  const details = d3.select('body .splitLayout').append('div')
    .attr('class', 'datailsText')
    .attr('style', 'background-color:lightgrey; outline: thin solid black; width: 400px; height: 100%;') 

  details.append("div")
    .attr('class', 'universityField')
    .attr("width", 100)
    .attr("height", 100);

  details.append("div")
    .attr('class', 'personNameField')
    .attr("width", 100)
    .attr("height", 100);

  showDetails({ institution_name: ' ', person_name: ' '});
}

async function showDetails(data) {
  const details = d3.select('.datailsText')
    details.select(".universityField")
      .text(`University: ${data.institution_name}`);
    details.select(".personNameField")
      .text(`Name: ${data.person_name}`);
}

async function draw(links, nodes) {
  console.log('links', links);
  console.log('nodes', nodes);
  let color_before_highlight;
  let node_r;

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
      .attr('r', 5)
      .attr('fill', d => colorScale(d.institution_name))
      .call(drag(simulation))
      .on("mouseover", function (d) {
        color_before_highlight = d3.select(this).attr("fill")
        node_r = d3.select(this).attr("r")
        d3.select(this)
          .attr("fill", "red")
          .attr("r", r_factor * node_r)
        showDetails(d)
    })
      .on("mouseout", function (d) {
        d3.select(this)
          .attr("fill", color_before_highlight)
          .attr("r", node_r);
    })

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
