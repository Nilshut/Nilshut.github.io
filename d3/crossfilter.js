export function init(filterData, nodeData) {
  const cf = crossfilter(filterData);

  const yearDim = cf.dimension(d => d.year);
  const durationDim = cf.dimension(d => d.duration);
  const institutionDim = cf.dimension(d => d.institution_id);
  const projectDim = cf.dimension(d => d.project_id_number);

  const getProjectIds = () => cf.allFiltered().map(d => projectDim.accessor(d));
  const getUniqueIds = (projectIds) => [...new Set(projectIds)];
  const getFilteredData = () => {
    const uniqueProjectIds = getUniqueIds(getProjectIds());
    return nodeData.filter(d => uniqueProjectIds.includes(d.project_id_number));
  }

  const filterRange = (dimension) => (from, to) => {
    dimension.filterRange([from, to]);
    return getFilteredData();
  }

  return {
    filterYear: filterRange(yearDim),
    filterDuration: filterRange(durationDim),
    filterInstitution: filterRange(institutionDim)
  }
}
