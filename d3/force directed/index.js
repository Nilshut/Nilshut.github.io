// function loadData() {
//   return d3.json('miserables.json');
// }

async function loadData() {
  return {
    nodes: await d3.csv('nodes.csv'),
    links: await d3.csv('links.csv')
  };
}

async function draw() {
  const data = await loadData();
  data.links = data.links.filter((l, i) => i < 10000);
  const nodeNames = data.links.reduce((n, l) => {
    if (!n.includes(l.source)) {
      n = [...n, l.source];
    }
    if (!n.includes(l.target)) {
      n = [...n, l.target];
    }
    return n;
  }, []);

  console.log(nodeNames);
  data.nodes = data.nodes.filter(n => nodeNames.includes(n.person_id));
  console.log(data);
  const height = 2000;
  const width = 2000;

  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));
  console.log(links);


  const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.person_id))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2));

  const svg = d3.select('body').append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);

  const link = svg.append('g')
    .attr('class', 'links')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('stroke-width', d => Math.sqrt(d.value));

  const node = svg.append('g')
    .attr('class', 'nodes')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
  .selectAll('circle')
  .data(nodes)
  .join('circle')
    .attr('r', 5)
    .attr('fill', d => colorScale(d.address))
    .call(drag(simulation));

  node.append('title')
    .text(d => d.name);

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

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

draw();
