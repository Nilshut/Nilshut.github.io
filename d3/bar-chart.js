
export function createBarChart(name, group, filterCb) {
  const y = d3.scaleLinear()
    .range([100, 0])
    .domain([0, group.top(1)[0].value]);

  const xDomain = Object.values(group.all()).map(d => d.key);
  const x = d3.scaleBand()
    .range([0, xDomain.length * 20])
    .domain(xDomain)
    .padding(0.1)

  const width = x.range()[1];
  const height = y.range()[0];

  const filtersNode = d3.select('.filters');

  const g = filtersNode.append("svg")
    .attr("width", width)
    .attr("height", height + 30)
      .append("g");
        // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  g.append("clipPath")
    .attr("id", `clip-${name}`)
    .append("rect")
      .attr("width", width)
      .attr("height", height);

  g.selectAll(".bar")
    .data(group.all())
    // .data(["background", "foreground"])
    .join("rect")
      .attr('fill', 'lightblue')
      .attr("class", d => `${d.key} bar`)
      .attr("x", function(d) { return x(d.key); })
      .attr("width", x.bandwidth())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });
            // .datum(group.all());

  // g.selectAll(".foreground.bar")
  //   .attr("clip-path", `url(#clip-${name})`);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "brush")
    .call(d3.brushX()
    .extent([[0, 0], [width, height]])
    .on("end", brushended));

  function brushended() {
    if (!d3.event.sourceEvent) return;
    if (!d3.event.selection) {
      return filterCb(x.domain()[0, 1])
    }

    const valueRange = d3.event.selection
      .map(sel => Math.round(sel / x.step()))
      .map(index => x.domain()[index]);

    filterCb(...valueRange);
  }
}



  // handle.selectAll("rect").attr("height", height);
  // handle.selectAll(".resize").append("path").attr("d", resizePath);

    // function barPath(groups) {
    //   var path = [],
    //       i = -1,
    //       n = groups.length,
    //       d;
    //   while (++i < n) {
    //     d = groups[i];
    //     path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
    //   }
    //   return path.join("");
    // }

  //   function resizePath(d) {
  //     var e = +(d == "e"),
  //         x = e ? 1 : -1,
  //         y = height / 3;
  //     return "M" + (.5 * x) + "," + y
  //         + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
  //         + "V" + (2 * y - 6)
  //         + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
  //         + "Z"
  //         + "M" + (2.5 * x) + "," + (y + 8)
  //         + "V" + (2 * y - 8)
  //         + "M" + (4.5 * x) + "," + (y + 8)
  //         + "V" + (2 * y - 8);
  //   }
  // }

  // brush.on("brushstart.chart", function() {
  //   var div = d3.select(this.parentNode.parentNode.parentNode);
  //   div.select(".title a").style("display", null);
  // });

  // brush.on("brush.chart", function() {
  //   var g = d3.select(this.parentNode),
  //       extent = brush.extent();
  //   if (round) g.select(".brush")
  //       .call(brush.extent(extent = extent.map(round)))
  //     .selectAll(".resize")
  //       .style("display", null);
  //   g.select("#clip-" + id + " rect")
  //       .attr("x", x(extent[0]))
  //       .attr("width", x(extent[1]) - x(extent[0]));
  //   dimension.filterRange(extent);
  // });

  // brush.on("brushend.chart", function() {
  //   if (brush.empty()) {
  //     var div = d3.select(this.parentNode.parentNode.parentNode);
  //     div.select(".title a").style("display", "none");
  //     div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
  //     dimension.filterAll();
  //   }
  // });

//   chart.margin = function(_) {
//     if (!arguments.length) return margin;
//     margin = _;
//     return chart;
//   };

//   chart.x = function(_) {
//     if (!arguments.length) return x;
//     x = _;
//     axis.scale(x);
//     brush.x(x);
//     return chart;
//   };

//   chart.y = function(_) {
//     if (!arguments.length) return y;
//     y = _;
//     return chart;
//   };

//   chart.dimension = function(_) {
//     if (!arguments.length) return dimension;
//     dimension = _;
//     return chart;
//   };

//   chart.filter = function(_) {
//     if (_) {
//       brush.extent(_);
//       dimension.filterRange(_);
//     } else {
//       brush.clear();
//       dimension.filterAll();
//     }
//     brushDirty = true;
//     return chart;
//   };

//   chart.group = function(_) {
//     if (!arguments.length) return group;
//     group = _;
//     return chart;
//   };

//   chart.round = function(_) {
//     if (!arguments.length) return round;
//     round = _;
//     return chart;
//   };

//   return d3.rebind(chart, brush, "on");
// }
