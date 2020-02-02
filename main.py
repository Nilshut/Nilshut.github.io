import pandas as pd
import time    #sleep
import json
import math

# import plotly.graph_objects as go
# import plotly.express as px
# from plotly.subplots import make_subplots
# import chart_studio.plotly as py
# from plotly.graph_objs import *

from os import path
import numpy as np

filename_german_geocoded = "german_institutes_geocoded.pkl"
filename_international_geocoded = "international_institutes_geocoded.pkl"
filename_preprocessed_project_data = "data/preprocessed_project_data.pkl"
filename_filter_data = "data/filter_data.csv"
filename_filter_data_with_subject = "data/filter_data_with_subject.csv"
filename_filter_data_with_all_infos = "data/filter_data_with_all_infos.csv"
filename_network_data = "data/network_data.csv"
filename_subject_data = "data/subject_data.csv"

filename_links = "data/links.pkl"
filename_links_csv = "data/links.csv"
filename_nodes_csv = "data/nodes.csv"
filename_nodes_with_institutes_csv = "data/nodes_with_institutes.csv"

collect_df_length = None

def add_rows_for_each_project_year(projects_data, mean_duration):
    print(str(len(projects_data[projects_data.funding_start_year.isnull()])) + " /" + str(
        len(projects_data)) + " projects without funding_start_year")
    print(str(len(projects_data[projects_data.funding_end_year.isnull()])) + " /" + str(
        len(projects_data)) + " projects without funding_end_year")

    df = pd.DataFrame(columns=projects_data.columns.tolist() + ['year'])
    for _, row in projects_data.iterrows():
        print(str(_) + " / "+ str(len(projects_data)))
        start_year = row.funding_start_year
        if(math.isnan(start_year)):
            #no start year: mean duration
            for i in range(int(mean_duration)):
                new_row = row.append(pd.Series([row.funding_end_year-i],index=['year']))
                df = df.append(new_row, ignore_index=True)
        elif( math.isnan(row.funding_end_year)):
            #no end year: mean duration
            for i in range(int(mean_duration)):
                new_row = row.append(pd.Series([row.funding_start_year+i], index=['year']))
                df = df.append(new_row, ignore_index=True)
        else:
            for i in range (row.duration):
                series = pd.Series([start_year + i],index=['year'])
                new_row = row.append(series)
                df = df.append(new_row,ignore_index=True)
    return df

def preprocess_filter_data():
    # load gepris data
    projects = pd.read_csv('gepris/extracted_project_data.csv')
    institutes = pd.read_csv("gepris/extracted_institution_data.csv")
    relations = pd.read_csv("gepris/project_institution_relations.csv")
    projects_data = projects.merge(relations, on='project_id_number').merge(institutes, on='institution_id')
    projects_data = projects_data.drop(['project_abstract','description', 'phone', 'fax', 'email','internet', 'parent_project_id'], axis=1)

    # remove start and end years are NaN
    print(str(len(projects_data[projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull()])) + " projects dropped with funding end and start NaN")
    projects_data = projects_data[~(projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull())]

    # add column project duration ; if one is none take mean duration
    projects_data['duration'] = (projects_data.funding_end_year + 1 - projects_data.funding_start_year).fillna(3).astype(int)
    # mean_duration = projects_data.duration.mean()
    # projects_data = add_rows_for_each_project_year(projects_data, mean_duration)
    return projects_data

def get_person_from_gepris():
    persons = pd.read_csv('gepris/extracted_person_data.csv')
    persons = persons.drop(['phone', 'fax', 'email', 'internet'], axis=1)
    persons_relation = pd.read_csv('gepris/project_person_relations.csv')
    persons = persons.merge(persons_relation, on='person_id')
    return persons

def fix_research_area(project_to_subject):
    new_research_areas = pd.Series()
    for index, row in project_to_subject.iterrows():
        x = row.research_area.split("(")[0]
        new_research_areas = new_research_areas.append(pd.Series([x],[index]))
    project_to_subject['research_area'] = new_research_areas

    return project_to_subject

def main():

    # #------------------------ network data -----------------------------
    #
    # network_data = get_person_from_gepris()
    # network_data = network_data.drop(['address'], axis=1)
    #
    # #save to csv
    # #network_data.to_csv(filename_network_data, index=False)
    #
    # nodes = network_data.drop_duplicates('person_id')
    # nodes = nodes.drop(['relation_type'],axis=1)        #['project_id_number']
    # nodes = nodes.rename(columns={"name" : "person_name"})
    #
    # people_institutes = pd.read_csv("gepris/people_joined_with_institutions.csv")
    # people_institutes = people_institutes[['person_id','institution_id']]
    # people_institutes = people_institutes.dropna().astype('int64')
    #
    # #add institutes name
    # institutes = pd.read_csv("gepris/extracted_institution_data.csv")
    # institutes = institutes.drop(['phone','fax','email','internet','address'],axis=1)
    # nodes = nodes.merge(people_institutes,on='person_id')
    # nodes_final = nodes.merge(institutes, on='institution_id')
    #
    # #nodes_final.to_csv(filename_nodes_with_institutes_csv, index=False)
    #
    # #----------------------------- links --------------------------------
    #
    # # links = pd.DataFrame(columns=["person1","person2","collaborations"])#columns=network_data.columns)
    # # for project in network_data.project_id_number.unique():
    # #     project_members = network_data[network_data.project_id_number == project]
    # #     if(len(project_members)>1):
    # #         print(project)
    # #         for person in project_members.person_id.apply(str):
    # #             for others in project_members.person_id.apply(str):
    # #                 if(others != person):
    # #                     row = pd.Series([person,others,1],index=["person1","person2","collaborations"])
    # #                     links = links.append(row,ignore_index=True)
    # # links.to_pickle(filename_links)
    #
    # links = pd.read_pickle(filename_links)
    # links[['source', 'target']] = links[['source', 'target']].apply(pd.to_numeric)
    #
    # # links = links.drop(["collaborations"],axis=1)
    # # links = links.groupby(['person1','person2']).size().reset_index()
    # # links = links.rename(columns={"person1" : "source", "person2" : "target" , 0 : "value"})
    # # links.to_pickle(filename_links)
    #
    # links = links[links.source.isin(nodes_final.person_id)]
    # links = links[links.target.isin(nodes_final.person_id)]
    #
    # # #save to csv
    # # links.to_csv(filename_links_csv, index=False)


    #------------------------------- filter data ----------------------------
    filter_data = preprocess_filter_data()
    filter_data = filter_data.drop(['address'], axis=1)
    filter_data.project_id_number = filter_data.project_id_number.astype(np.int64)
    filter_data = filter_data.rename(columns={"name": "institution_name"})

    #save to csv
    if (not path.exists(filename_filter_data_with_all_infos)):
        filter_data.to_csv(filename_filter_data_with_all_infos, index=False)

    #--------------------------------- subjects ----------------------------------
    project_to_subject = pd.read_csv('gepris/project_ids_to_participating_subject_areas.csv')
    subject_areas = pd.read_csv('gepris/subject_areas.csv')
    project_to_subject = project_to_subject.merge(subject_areas, on='subject_area')
    project_to_subject = fix_research_area(project_to_subject)          #remove Mitglieder number (231 Mitglieder)

    # save to csv
    if (not path.exists(filename_subject_data)):
        project_to_subject.to_csv(filename_subject_data, index=False)

    print("DEBUG")

def select_subject_ranking(ranking_data, subject_name):
    only_subject = ranking_data[ranking_data['subject'] == subject_name]
    return  only_subject

def merge_projects_joined_and_subjects(projects):
    subjects = pd.read_csv('gepris/project_ids_to_participating_subject_areas.csv')
    subjects.project_id = subjects.project_id.astype(np.int64)
    projects.project_id_number = projects.project_id_number.astype(np.int64)
    projects_joined = projects.merge(subjects, left_on='project_id_number', right_on='project_id')
    return projects_joined

if(__name__=="__main__"):
    main()