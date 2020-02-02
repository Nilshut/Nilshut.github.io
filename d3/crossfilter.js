export function init(filterData, nodeData, linkData) {
  const cf = crossfilter(filterData);

  const yearDim = cf.dimension(d => d.year);
  const durationDim = cf.dimension(d => d.duration);
  const institutionDim = cf.dimension(d => d.institution_id);
  const projectDim = cf.dimension(d => d.project_id_number);

  const getProjectIds = () => cf.allFiltered().map(d => projectDim.accessor(d));
  const getUniqueIds = (projectIds) => [...new Set(projectIds)];
  const getFilteredData = () => {
    const uniqueProjectIds = getUniqueIds(getProjectIds());
    const nodes = nodeData.filter(d => uniqueProjectIds.includes(d.project_id_number));
    const personIds = nodes.map(node => node.person_id);
    return {
      nodes,
      links: linkData.filter(d => personIds.includes(d.source) && personIds.includes(d.target))
    };
  }

  const filterRange = (dimension) => (from, to) => {
    dimension.filterAll();
    if (from && to) {
      dimension.filterRange([from, to]);
    }
    return getFilteredData();
  }

  return {
    filterYear: filterRange(yearDim),
    filterDuration: filterRange(durationDim),
    filterInstitution: filterRange(institutionDim),
    yearGroup: yearDim.group(),
    durationGroup: durationDim.group(),
    institutionGroup: institutionDim.group()
  }
}
