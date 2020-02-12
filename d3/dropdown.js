export function createDropdown(title, name, dimension, labels, filterCb) {
  const filtersNode = d3.select('.filters .dropdowns').append('div').attr('class', 'filter');

  filtersNode.append('div').attr('class', 'title').text(title);

  const input = filtersNode.append('input')
    .attr('list', `${name}-list`);

  input.on('change', function () {
    const label = labels.find(l => l.label === this.value);
    filterCb(label ? label.id : undefined);
  });

  const dataList = filtersNode.append('datalist')
    .attr('id', `${name}-list`);

  const group = dimension.group();

  function redraw() {
    const filteredKeys = group.all().filter(d => d.value).map(({key}) => key);
    const filteredLabels = labels.filter(d => filteredKeys.includes(d.id));
    dataList.selectAll('option')
      .data(filteredLabels)
      .join('option')
      .attr('value', d => d.label);
  }

  redraw();
  return redraw;
}
