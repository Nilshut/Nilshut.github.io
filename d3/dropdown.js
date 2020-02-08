export function createDropdown(title, name, labels, filterCb) {
  const filtersNode = d3.select('.filters');

  filtersNode.append('div').text(title);

  const input = filtersNode.append('input')
    .attr('list', `${name}-list`);

  input.on('change', function () {
    const id = labels.find(l => l.label === this.value).id
    filterCb(id);
  });

  filtersNode.append('datalist')
    .attr('id', `${name}-list`)
    .selectAll('option')
      .data(labels)
      .join('option')
      .attr('value', d => d.label);
}
