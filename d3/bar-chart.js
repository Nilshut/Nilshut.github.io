
export function createBarChart(title, name, dimension, filterCb) {
  const group = dimension.group();
  const y = d3.scaleSymlog()
    .range([200, 0])
    .domain([0, group.top(1)[0].value]);

  const xDomain = Object.values(group.all()).map(d => d.key);
  const x = d3.scaleBand()
    .range([0, xDomain.length * 24])
    .domain(xDomain)
    .padding(0.1)

  const width = x.range()[1];
  const height = y.range()[0];

  const filtersNode = d3.select('.filters .bar-charts').append('div').attr('class', 'filter');

  filtersNode.append('div').attr('class', 'title').text(title);

  const g = filtersNode.append("svg")
    .attr("width", width)
    .attr("height", height + 50)
      .append("g");

  g.append("clipPath")
    .attr("id", `clip-${name}`)
    .append("rect")
      .attr("width", width)
      .attr("height", height);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height + 20})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "brush")
    .call(d3.brushX()
    .extent([[0, 20], [width, height]])
    .on("end", brushended));

  function brushended() {
    if (!d3.event.sourceEvent) return;
    if (!d3.event.selection) {
      return filterCb();
    }

    const valueRange = d3.event.selection
      .map(sel => Math.round(sel / x.step()))
      .map(index => x.domain()[index]);

    valueRange[0] = valueRange[0] || x.domain()[0] - 1;
    valueRange[1] = valueRange[1] || x.domain()[x.domain().length - 1] + 1;

    filterCb(...valueRange);
  }

  function redraw() {
    g.selectAll(".bar")
      .data(group.all())
      .join("rect")
        .attr('fill', 'lightblue')
        .attr("class", d => `${d.key} bar`)
        .attr("x", function(d) { return x(d.key); })
        .attr("width", x.bandwidth())
        .attr("y", function(d) { return y(d.value) + 20; })
        .attr("height", function(d) { return height - y(d.value); });
  }

  redraw();
  return redraw;
}
