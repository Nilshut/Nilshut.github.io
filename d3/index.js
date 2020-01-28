async function loadData() {
  const data = {
    nodes: await d3.csv('nodes.csv'),
    links: await d3.csv('links.csv')
  };

  data.links = data.links.filter((l, i) => i < 1000);
  const nodeNames = data.links.reduce((n, l) => {
    if (!n.includes(l.source)) {
      n = [...n, l.source];
    }
    if (!n.includes(l.target)) {
      n = [...n, l.target];
    }
    return n;
  }, []);

  data.nodes = data.nodes.filter(n => nodeNames.includes(n.person_id));

  return data;
}

async function main() {
  data = await loadData();
  data.links = data.links.map(d => Object.create(d));
  data.nodes = data.nodes.map(d => Object.create(d));

  setup();

  draw(data.links, data.nodes);
}

async function setup() {
  const svg = d3.select('body').append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height]);

  svg.append('g')
    .attr('class', 'links')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6);

  svg.append('g')
    .attr('class', 'nodes')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);
}

async function draw(links, nodes) {
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
      .attr('fill', d => colorScale(d.address))
      .call(drag(simulation));

  node.append('title').text(d => d.name);

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
  const nodes = data.nodes.filter(n => personIds.includes(n.person_id));
  const links = data.links.filter(l => personIds.includes(l.source.person_id) && personIds.includes(l.target.person_id));

  console.log(personIds, nodes, links);
  draw(links, nodes);
}

function getPersonIdsRelatedTo(roots, depth = 5) {
  const newRoots = data.links.filter(l => roots.includes(l.source.person_id) || roots.includes(l.target.person_id));
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

let data;
const height = 2000;
const width = 2000;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

main();
