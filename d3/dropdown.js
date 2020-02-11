export function createDropdown(title, name, labels, filterCb) {
  const filtersNode = d3.select('.filters');

  filtersNode.append('div').text(title);

  const input = filtersNode.append('input')
    .attr('list', `${name}-list`);

  input.on('change', function () {
    const label = labels.find(l => l.label === this.value);
    filterCb(label ? label.id : undefined);
  });

  filtersNode.append('datalist')
    .attr('id', `${name}-list`)
    .selectAll('option')
      .data(labels)
      .join('option')
      .attr('value', d => d.label);
}
