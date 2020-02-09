export function init(filterData, connectionData, nodeData, linkData) {
  const cf = crossfilter(filterData);

  const yearDim = cf.dimension(d => d.funding_start_year);
  const durationDim = cf.dimension(d => d.duration);
  const institutionDim = cf.dimension(d => d.institution_id);
  const institutionNameDim = cf.dimension(d => d.institution_name);
  const projectDim = cf.dimension(d => d.project_id_number);
  const subjectDim = cf.dimension(d => d.subject || 'N / A');
  const personDim = cf.dimension(d => d.person_ids, true);

  const getProjectIds = () => cf.allFiltered().map(d => projectDim.accessor(d));
  const getUniqueIds = (projectIds) => [...new Set(projectIds)];
  const getFilteredData = () => {
    const uniqueProjectIds = getUniqueIds(getProjectIds());
    const personIds = connectionData
      .filter(d => uniqueProjectIds.includes(d.project_id_number))
      .map(node => node.person_id);

    return {
      nodes: nodeData.filter(d => personIds.includes(d.person_id)),
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

  const personLabels = () => {
    const ids = personDim.group().all().map(({ key }) => key);
    return ids.map(dimId => ({
      id: dimId,
      label: nodeData.find(d => d.person_id === dimId).person_name
    }));
  };

  return {
    filterYear: filterRange(yearDim),
    filterDuration: filterRange(durationDim),
    filterInstitution: filterExact(institutionDim),
    filterSubject: filterExact(subjectDim),
    filterPerson: filterExact(personDim),
    yearGroup: yearDim.group(),
    durationGroup: durationDim.group(),
    institutionGroup: institutionDim.group(),
    subjectGroup: subjectDim.group(),
    institutionLabels: labels(institutionDim, institutionNameDim),
    subjectLabels: labels(subjectDim, subjectDim),
    personDim,
    personGroup: personDim.group(),
    personLabels: personLabels()
  }
}
