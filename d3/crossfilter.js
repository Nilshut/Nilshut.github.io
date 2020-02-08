export function init(filterData, connectionData, nodeData, linkData) {
  const cf = crossfilter(filterData);

  const yearDim = cf.dimension(d => d.funding_start_year);
  const durationDim = cf.dimension(d => d.duration);
  const institutionDim = cf.dimension(d => d.institution_id);
  const institutionNameDim = cf.dimension(d => d.institution_name);
  const projectDim = cf.dimension(d => d.project_id_number);
  const subjectDim = cf.dimension(d => d.subject || 'N / A');

  const getProjectIds = () => cf.allFiltered().map(d => projectDim.accessor(d));
  const getUniqueIds = (projectIds) => [...new Set(projectIds)];
  const getFilteredData = () => {
    const uniqueProjectIds = getUniqueIds(getProjectIds());
    const personIds = connectionData
      .filter(d => uniqueProjectIds.includes(d.project_id_number))
      .map(node => node.person_id);

    const nodes = nodeData.filter(d => personIds.includes(d.person_id));
    const nodePersonIds = nodes.map(node => node.person_id);
    return {
      nodes,
      links: linkData.filter(d => nodePersonIds.includes(d.source) && nodePersonIds.includes(d.target))
    };
  }

  const filterRange = (dimension) => (from, to) => {
    dimension.filterAll();
    if (from && to) {
      dimension.filterRange([from, to]);
    }
    return getFilteredData();
  }

  const filterExact = (dimension) => (val) => {
    dimension.filterAll();
    if (val) {
      dimension.filterExact(val);
    }
    return getFilteredData();
  }

  const labels = (dim, labelDim) => {
    const ids = dim.group().all().map(({ key }) => key);
    return ids.map(dimId => ({
      id: dimId,
      label: dimId === 'N / A' ? dimId : labelDim.accessor(
        cf.all().find(d => dim.accessor(d) === dimId)
      )
    }));
  }

  return {
    filterYear: filterRange(yearDim),
    filterDuration: filterRange(durationDim),
    filterInstitution: filterExact(institutionDim),
    filterSubject: filterExact(subjectDim),
    yearGroup: yearDim.group(),
    durationGroup: durationDim.group(),
    institutionGroup: institutionDim.group(),
    subjectGroup: subjectDim.group(),
    institutionLabels: labels(institutionDim, institutionNameDim),
    subjectLabels: labels(subjectDim, subjectDim)
  }
}
