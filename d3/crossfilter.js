const dataAmountThreshold = 1000;

export function init(filterData, connectionData, nodeData) {
  const cf = crossfilter(filterData);

  const yearDim = cf.dimension(d => d.funding_start_year);
  const durationDim = cf.dimension(d => d.duration);
  const institutionDim = cf.dimension(d => d.institution_id);
  const institutionNameDim = cf.dimension(d => d.institution_name);
  const projectDim = cf.dimension(d => d.project_id_number);
  const projectNameDim = cf.dimension(d => d.project_name);
  const subjectDim = cf.dimension(d => d.subject || 'N / A');
  const personDim = cf.dimension(d => d.person_ids, true);

  const getUniqueProjectIds = () => [...new Set(cf.allFiltered().map(d => projectDim.accessor(d)))];
  const getUniqueProjectNames = () => [...new Set(cf.allFiltered().map(d => projectNameDim.accessor(d)))];
  const getFilteredData = () => {
    const uniqueProjectIds = getUniqueProjectIds();
    if (uniqueProjectIds.length > dataAmountThreshold) {
      return;
    }
    const projectConnections = connectionData.filter(d => uniqueProjectIds.includes(d.project_id_number));
    const personIds = projectConnections.map(node => node.person_id);
    const nodes = nodeData.filter(d => personIds.includes(d.person_id));

    return {
      nodes,
      links: getLinks(projectConnections, personIds),
      projects: getUniqueProjectNames()
    };
  }

  const getLinks = (projectConnections, personIds) => {
    const personsByProject = projectConnections
      .reduce((groupByProject, currentConnection) => {
        if (!groupByProject[currentConnection.project_id_number]) {
          groupByProject[currentConnection.project_id_number] = [];
        }
        groupByProject[currentConnection.project_id_number].push(currentConnection.person_id);
        return groupByProject;
      }, {});

    const connectedPersons = personIds.reduce((result, personId) => {
      result[personId] = [...new Set(Object.values(personsByProject)
        .reduce((connectedPersonIds, personsInProject) => {
          if (personsInProject.includes(personId)) {
            return [...connectedPersonIds, ...personsInProject.filter(p => p !== personId)];
          }
          return connectedPersonIds;
        }, [])
      )];
      return result;
    }, {})

    return Object.entries(connectedPersons).reduce((result, [personId, connectedPersonIds]) => {
      connectedPersonIds.forEach(c => {
        let connection = result.find(d => d.source === +personId && d.target === c || d.source === c && d.target === +personId);
        if (!connection) {
          result.push({ source: +personId, target: c, value: 0 });
          connection = result[result.length - 1];
        }

        connection.value += 1;
      });

      return result;
    }, [])
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
    projectDim,
    personDim,
    yearDim,
    durationDim,
    institutionDim,
    subjectDim,
    filterRange,
    filterExact,
    getFilteredData,
    personLabels: personLabels(),
    institutionLabels: labels(institutionDim, institutionNameDim),
    subjectLabels: labels(subjectDim, subjectDim),
  }
}
