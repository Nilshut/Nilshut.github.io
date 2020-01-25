import pandas as pd
import time    #sleep
import json
import math

import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px

# import chart_studio.plotly as py
# from plotly.graph_objs import *

from os import path
import numpy as np

#https://ranking.zeit.de/che/de/irgendwasmit/show#tags-begriffe_TECHNIK_-BAU---ENERGIE
#Datenstand: Mai 2019 sind die Daten veröffentlicht worden.

count = 0
filename_german_geocoded = "german_institutes_geocoded.pkl"
filename_international_geocoded = "international_institutes_geocoded.pkl"
filename_preprocessed_project_data = "data/preprocessed_project_data.pkl"
filename_filter_data = "data/filter_data.csv"
filename_network_data = "data/network_data.csv"

collect_df_length = None

def add_rows_for_each_project_year(projects_data,mean_duration):
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

def preprocess_projects_data():
    projects = pd.read_csv('gepris/extracted_project_data.csv')
    institutes = pd.read_csv("gepris/extracted_institution_data.csv")
    relations = pd.read_csv("gepris/project_institution_relations.csv")
    projects_data = projects.merge(relations, left_on='project_id_number', right_on='project_id_number').merge(institutes,
                                                                                                               left_on='institution_id',
                                                                                                               right_on='institution_id')
    projects_data = projects_data.drop(
        ['title', 'project_abstract', 'participating_subject_areas_full_string', 'description', 'phone', 'fax', 'email',
         'internet', 'parent_project_id'], axis=1)

    # remove start and end years are NaN
    print(str(len(projects_data[
                      projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull()])) + " projects dropped with funding end and start NaN")
    projects_data = projects_data[~(projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull())]

    # add column project duration
    projects_data['duration'] = (projects_data.funding_end_year + 1 - projects_data.funding_start_year).fillna(
        0).astype(int)
    mean_duration = projects_data.duration.mean()

    projects_data = add_rows_for_each_project_year(projects_data, mean_duration)
    projects_data = projects_data.drop(columns=['funding_start_year', 'funding_end_year'])
    projects_data.to_pickle(filename_preprocessed_project_data)

def main():
    #preprocess project data
    if (not path.exists(filename_preprocessed_project_data)):
        preprocess_projects_data()
    projects_data = pd.read_pickle(filename_preprocessed_project_data)                          #preprocess_projects_data()
    projects_data.project_id_number = projects_data.project_id_number.astype(np.int64)

    #network data
    persons = pd.read_csv('gepris/extracted_person_data.csv')
    persons = persons.drop(['phone','fax','email','internet'],axis=1)
    persons_relation = pd.read_csv('gepris/project_person_relations.csv')
    network_data = persons.merge(persons_relation,on='person_id')
    #save to csv
    #network_data.to_csv(filename_network_data, index=False)

    #filter data
    #add subjects
    unique_projects_before = len(projects_data.project_id_number.unique())
    subjects = pd.read_csv('gepris/project_ids_to_participating_subject_areas.csv')
    subjects.project_id = subjects.project_id.astype(np.int64)
    filter_data = projects_data.merge(subjects, left_on='project_id_number', right_on='project_id')
    unique_projects_after = len(filter_data.project_id_number.unique())

    #filter project data
    filter_data = filter_data.drop(['dfg_verfahren', 'relation_type', 'name', 'address'], axis=1)

    #save to csv
    #filter_data.to_csv(filename_filter_data, index=False)

def get_lon_lat_for_rating_data(data_joined):
    # add geo to ranking data
    ranking_data_with_geo = data_joined.drop(columns=["project_id_number", 'relation_type', 'name', 'address', 'duration', 'year'])
    ranking_data_with_geo = ranking_data_with_geo.drop_duplicates(['university','subject'])
    overall_situation_mean = ranking_data_with_geo.groupby('university')['overall_study_situation'].agg(np.mean)
    ranking_data_ready_to_plot = ranking_data_with_geo.drop_duplicates('university')
    ranking_data_ready_to_plot = ranking_data_ready_to_plot.drop(columns=['overall_study_situation'])
    overall_situation_mean_df = pd.DataFrame([overall_situation_mean.values, overall_situation_mean.index],
                                             index=['overall_study_situation', 'university']).T
    ranking_data_ready_to_plot = ranking_data_ready_to_plot.merge(overall_situation_mean_df, on='university')
    return ranking_data_ready_to_plot

def add_projects_per_institutes(projects_data_with_geo):
    #unique_inst_count = len(projects_data_with_geo.name.unique())
    #unique_address_count = len(projects_data_with_geo.address.unique())

    project_count_per_inst = projects_data_with_geo['address'].value_counts().rename_axis('address').reset_index(name="project_count")
    project_count_per_inst_geo = projects_data_with_geo.merge(project_count_per_inst, on='address', how='left')
    return  project_count_per_inst_geo

def preprocess_ranking_data(ranking_data):
    #data types and removing ','
    ranking_data.total_number_of_students = pd.to_numeric(ranking_data['total_number_of_students'].str.replace(',', ''))
    ranking_data.population_of_the_town = pd.to_numeric(ranking_data['population_of_the_town'].str.replace(',', ''))
    ranking_data.proportion_of_students_in_the_town = pd.to_numeric(ranking_data['proportion_of_students_in_the_town'])
    ranking_data.students_at_this_campus = ranking_data.students_at_this_campus.str.replace(",","").astype(float)

    #add institute id column
    universities_unique = pd.Series(ranking_data['university'].unique())
    universities_df = pd.DataFrame({'university':universities_unique.values,'institute_id_ranking' : universities_unique.index})
    ranking_data = ranking_data.merge(universities_df, on='university')
    ranking_data = ranking_data[ranking_data.columns.tolist()[-1:] + ranking_data.columns.tolist()[:-1]]   #id to first column

    return ranking_data

def select_subject_ranking(ranking_data, subject_name):
    only_subject = ranking_data[ranking_data['subject'] == subject_name]
    return  only_subject



# def preprocess_projects_data():
#      #load and merge project and institute data
#      projects = pd.read_csv('gepris/extracted_project_data.csv')
#      institutes = pd.read_csv("gepris/extracted_institution_data.csv")
#      relations = pd.read_csv("gepris/project_institution_relations.csv")
#      projects_data = projects.merge(relations, left_on='project_id_number', right_on='project_id_number').merge(
#           institutes, left_on='institution_id', right_on='institution_id')
#      projects_data = projects_data.drop(['title','project_abstract','participating_subject_areas_full_string',
#                                          'description','phone','fax','email','internet','parent_project_id',
#                                          'dfg_verfahren'],axis=1)
#
#      #remove start and end years are NaN
#      print(str(len(projects_data[projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull()]))+
#            " projects dropped with funding end and start NaN")
#      projects_data = projects_data[~(projects_data.funding_start_year.isnull() & projects_data.funding_end_year.isnull())]
#
#      #add column project duration
#      projects_data['duration'] = (projects_data.funding_end_year + 1 - projects_data.funding_start_year).fillna(
#          0).astype(int)
#      mean_duration = projects_data.duration.mean()
#
#      #select only projects after 2014
#      projects_data = projects_data[projects_data.funding_start_year > 2014]
#      projects_data = add_rows_for_each_project_year(projects_data, mean_duration)
#      projects_data = projects_data.drop(columns=['funding_start_year', 'funding_end_year'])
#      projects_data.to_pickle(filename_preprocessed_project_data)

def seperate_german_and_international_projects_data(projects_data):
     series_bool_is_german = projects_data.address.str.contains("Deutschland") #filter in german and others
     german_institutes = projects_data.loc[series_bool_is_german].reset_index(drop=True)
     international_institutes = projects_data.loc[~series_bool_is_german].reset_index(drop=True)
     return [german_institutes,international_institutes]

def merge_projects_joined_and_subjects(projects):
    subjects = pd.read_csv('gepris/project_ids_to_participating_subject_areas.csv')
    subjects.project_id = subjects.project_id.astype(np.int64)
    projects.project_id_number = projects.project_id_number.astype(np.int64)
    projects_joined = projects.merge(subjects, left_on='project_id_number', right_on='project_id')
    return projects_joined

if(__name__=="__main__"):
    main()