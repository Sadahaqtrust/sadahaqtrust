\.


--
-- Data for Name: sadahaq_view_rohtak_eagle_view; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_view_rohtak_eagle_view (dept_id, dept_code, dept_name, category, pid, colony, latitude, longitude) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_hours; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_hours (id, volunteer_id, task_id, hours, work_date, remarks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_interests; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_interests (id, volunteer_id, section_id, subsection_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_profiles; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_profiles (id, person_id, volunteer_type, dept_expertise, languages, cases_handled, cases_resolved, rating, on_duty, joined_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_sections; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_sections (id, section_name, slug, icon, sort_order, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_subsections; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_subsections (id, section_id, subsection_name, slug, description, sort_order, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteer_tasks; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteer_tasks (id, title, description, section_id, subsection_id, district, start_date, end_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sadahaq_volunteers; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

COPY public.sadahaq_volunteers (id, document_id, serial_no, enrollment_no, full_name, mobile, father_name, dob, institution, year_of_study, source_doc, created_at) FROM stdin;
\.


--
-- Name: dr_banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.dr_banners_id_seq', 1, false);


--
-- Name: dr_pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.dr_pages_id_seq', 1, false);


--
-- Name: sadahaq_gis_haryana_all_20250524_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_gis_haryana_all_20250524_id_seq', 1967118, true);


--
-- Name: sadahaq_gis_properties_haryana_20250523_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_gis_properties_haryana_20250523_id_seq', 1, false);


--
-- Name: sadahaq_gis_rohtak_all_20250523_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_gis_rohtak_all_20250523_id_seq', 209909, true);


--
-- Name: sadahaq_gis_rohtak_commercial_20250523_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_gis_rohtak_commercial_20250523_id_seq', 17568, true);


--
-- Name: sadahaq_osm_places_rohtak_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_osm_places_rohtak_id_seq', 205, true);


--
-- Name: sadahaq_ulb_rohtak_properties_20250523_id_seq; Type: SEQUENCE SET; Schema: public; Owner: medusa_user
--

SELECT pg_catalog.setval('public.sadahaq_ulb_rohtak_properties_20250523_id_seq', 136220, true);


--
-- Name: dr_banners dr_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.dr_banners
    ADD CONSTRAINT dr_banners_pkey PRIMARY KEY (id);


--
-- Name: dr_pages dr_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.dr_pages
    ADD CONSTRAINT dr_pages_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_gis_haryana_all_20250524 sadahaq_gis_haryana_all_20250524_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_haryana_all_20250524
    ADD CONSTRAINT sadahaq_gis_haryana_all_20250524_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_gis_properties_haryana_20250523 sadahaq_gis_properties_haryana_20250523_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_properties_haryana_20250523
    ADD CONSTRAINT sadahaq_gis_properties_haryana_20250523_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_gis_rohtak_all_20250523 sadahaq_gis_rohtak_all_20250523_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_rohtak_all_20250523
    ADD CONSTRAINT sadahaq_gis_rohtak_all_20250523_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_gis_rohtak_commercial_20250523 sadahaq_gis_rohtak_commercial_20250523_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_rohtak_commercial_20250523
    ADD CONSTRAINT sadahaq_gis_rohtak_commercial_20250523_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_osm_places_rohtak sadahaq_osm_places_rohtak_osm_id_key; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_osm_places_rohtak
    ADD CONSTRAINT sadahaq_osm_places_rohtak_osm_id_key UNIQUE (osm_id);


--
-- Name: sadahaq_osm_places_rohtak sadahaq_osm_places_rohtak_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_osm_places_rohtak
    ADD CONSTRAINT sadahaq_osm_places_rohtak_pkey PRIMARY KEY (id);


--
-- Name: sadahaq_ulb_rohtak_properties_20250523 sadahaq_ulb_rohtak_properties_20250523_pkey; Type: CONSTRAINT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_ulb_rohtak_properties_20250523
    ADD CONSTRAINT sadahaq_ulb_rohtak_properties_20250523_pkey PRIMARY KEY (id);


--
-- Name: idx_dr_banners_service_slug; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_dr_banners_service_slug ON public.dr_banners USING btree (service_slug);


--
-- Name: idx_dr_pages_service_slug; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_dr_pages_service_slug ON public.dr_pages USING btree (service_slug);


--
-- Name: idx_osm_places_category; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_osm_places_category ON public.sadahaq_osm_places_rohtak USING btree (category);


--
-- Name: idx_osm_places_coords; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_osm_places_coords ON public.sadahaq_osm_places_rohtak USING btree (latitude, longitude);


--
-- Name: idx_osm_places_name; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_osm_places_name ON public.sadahaq_osm_places_rohtak USING btree (name);


--
-- Name: idx_rk_all_cat; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_all_cat ON public.sadahaq_gis_rohtak_all_20250523 USING btree (property_category);


--
-- Name: idx_rk_all_colony; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_all_colony ON public.sadahaq_gis_rohtak_all_20250523 USING btree (colony_name);


--
-- Name: idx_rk_all_coords; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_all_coords ON public.sadahaq_gis_rohtak_all_20250523 USING btree (latitude, longitude);


--
-- Name: idx_rk_all_pid; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_all_pid ON public.sadahaq_gis_rohtak_all_20250523 USING btree (pid);


--
-- Name: idx_rk_all_type; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_all_type ON public.sadahaq_gis_rohtak_all_20250523 USING btree (property_type);


--
-- Name: idx_rk_comm_coords; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_comm_coords ON public.sadahaq_gis_rohtak_commercial_20250523 USING btree (latitude, longitude);


--
-- Name: idx_rk_comm_pid; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_comm_pid ON public.sadahaq_gis_rohtak_commercial_20250523 USING btree (pid);


--
-- Name: idx_rk_comm_type; Type: INDEX; Schema: public; Owner: medusa_user
--

CREATE INDEX idx_rk_comm_type ON public.sadahaq_gis_rohtak_commercial_20250523 USING btree (property_type);


--
-- PostgreSQL database dump complete
--

\unrestrict wEgMeMP6fLjBBZv6uRmV3YkWMydGjRUbuGwZ8Whaodo4IslqulJONqOfTu5QQ8u

