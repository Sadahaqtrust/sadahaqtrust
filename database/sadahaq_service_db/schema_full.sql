--
-- PostgreSQL database dump
--

\restrict wEgMeMP6fLjBBZv6uRmV3YkWMydGjRUbuGwZ8Whaodo4IslqulJONqOfTu5QQ8u

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dr_banners; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.dr_banners (
    id bigint NOT NULL,
    service_slug character varying(191) NOT NULL,
    title character varying(191) NOT NULL,
    subtitle text,
    image character varying(191),
    link character varying(191),
    sort_order integer DEFAULT 0 NOT NULL,
    status smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.dr_banners OWNER TO medusa_user;

--
-- Name: dr_banners_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.dr_banners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dr_banners_id_seq OWNER TO medusa_user;

--
-- Name: dr_banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.dr_banners_id_seq OWNED BY public.dr_banners.id;


--
-- Name: dr_pages; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.dr_pages (
    id bigint NOT NULL,
    service_slug character varying(191) NOT NULL,
    title character varying(191) NOT NULL,
    slug character varying(191) NOT NULL,
    content text,
    status smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.dr_pages OWNER TO medusa_user;

--
-- Name: dr_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.dr_pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dr_pages_id_seq OWNER TO medusa_user;

--
-- Name: dr_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.dr_pages_id_seq OWNED BY public.dr_pages.id;


--
-- Name: sadahaq_addresses; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_addresses (
    id integer,
    person_id integer,
    label character varying(40),
    house_no character varying(40),
    street character varying(150),
    colony character varying(150),
    ward character varying(60),
    city character varying(60),
    pincode character(6),
    property_id character varying(40),
    lat numeric(10,7),
    lng numeric(10,7),
    is_default boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_addresses OWNER TO medusa_user;

--
-- Name: sadahaq_anganwadi; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_anganwadi (
    id integer,
    source_doc_id integer,
    worker_name character varying(255),
    centre_name character varying(255),
    block_name character varying(120),
    phone character varying(30),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_anganwadi OWNER TO medusa_user;

--
-- Name: sadahaq_auth_tokens; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_auth_tokens (
    id integer,
    person_id integer,
    token_hash character varying(255),
    device_type character varying(255),
    ip_address character varying(45),
    is_revoked boolean,
    expires_at timestamp without time zone,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_auth_tokens OWNER TO medusa_user;

--
-- Name: sadahaq_ayush_staff; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ayush_staff (
    id integer,
    document_id integer,
    serial_no character varying(10),
    facility character varying(200),
    doctor_name character varying(150),
    doctor_phone character varying(15),
    staff_name character varying(150),
    staff_phone character varying(15),
    notes character varying(255),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_ayush_staff OWNER TO medusa_user;

--
-- Name: sadahaq_citizens; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_citizens (
    id integer,
    person_id integer,
    preferred_lang character varying(255),
    income_group character varying(255),
    consent_given boolean,
    consent_at timestamp without time zone,
    total_grievances integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_citizens OWNER TO medusa_user;

--
-- Name: sadahaq_colony_polygon_boundaries_mcr; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_colony_polygon_boundaries_mcr (
    id integer,
    colony_name character varying(255),
    fkulbid integer,
    boundary_polygon text
);


ALTER TABLE public.sadahaq_colony_polygon_boundaries_mcr OWNER TO medusa_user;

--
-- Name: sadahaq_covid_documents; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_covid_documents (
    id integer,
    filename character varying(255),
    source_url character varying(500),
    doc_title character varying(500),
    doc_date date,
    doc_type character varying(255),
    raw_text text,
    page_count smallint,
    file_hash character(64),
    ocr_used boolean,
    language character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_covid_documents OWNER TO medusa_user;

--
-- Name: sadahaq_covid_officers; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_covid_officers (
    id integer,
    document_id integer,
    serial_no character varying(10),
    full_name character varying(200),
    designation character varying(200),
    department character varying(200),
    mobile character varying(15),
    phone_office character varying(15),
    duty_assigned text,
    zone_area character varying(200),
    order_date date,
    source_doc character varying(255),
    raw_row text,
    is_verified boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_covid_officers OWNER TO medusa_user;

--
-- Name: sadahaq_ex_servicemen; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ex_servicemen (
    id integer,
    document_id integer,
    serial_no character varying(10),
    rank_abbr character varying(30),
    full_name character varying(150),
    village character varying(150),
    mobile character varying(15),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_ex_servicemen OWNER TO medusa_user;

--
-- Name: sadahaq_gis_haryana_all_20250524; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_gis_haryana_all_20250524 (
    id integer NOT NULL,
    pk_id integer,
    pid character varying(20),
    mc_name character varying(100),
    pk_property_id integer,
    colony_name character varying(300),
    owner_name character varying(500),
    address text,
    mobile_no character varying(20),
    property_category character varying(50),
    property_type character varying(100),
    plot_size character varying(50),
    area_type character varying(10),
    is_authorised boolean,
    is_integrated boolean,
    thematic character varying(20),
    img text,
    bill_sr_no integer,
    is_self_certified character varying(10),
    is_objection_approved character varying(50),
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_gis_haryana_all_20250524 OWNER TO medusa_user;

--
-- Name: sadahaq_gis_haryana_all_20250524_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_gis_haryana_all_20250524_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_gis_haryana_all_20250524_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_gis_haryana_all_20250524_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_gis_haryana_all_20250524_id_seq OWNED BY public.sadahaq_gis_haryana_all_20250524.id;


--
-- Name: sadahaq_gis_properties_haryana_20250523; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_gis_properties_haryana_20250523 (
    id integer NOT NULL,
    pk_id integer,
    pid character varying(20),
    mc_name character varying(100),
    pk_property_id integer,
    colony_name character varying(300),
    owner_name character varying(500),
    address text,
    mobile_no character varying(20),
    property_category character varying(50),
    property_type character varying(100),
    plot_size character varying(50),
    area_type character varying(10),
    is_authorised boolean,
    is_integrated boolean,
    thematic character varying(20),
    img text,
    bill_sr_no integer,
    is_self_certified character varying(10),
    is_objection_approved character varying(50),
    latitude numeric(10,7),
    longitude numeric(10,7),
    layer_source character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_gis_properties_haryana_20250523 OWNER TO medusa_user;

--
-- Name: sadahaq_gis_properties_haryana_20250523_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_gis_properties_haryana_20250523_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_gis_properties_haryana_20250523_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_gis_properties_haryana_20250523_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_gis_properties_haryana_20250523_id_seq OWNED BY public.sadahaq_gis_properties_haryana_20250523.id;


--
-- Name: sadahaq_gis_rohtak_all_20250523; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_gis_rohtak_all_20250523 (
    id integer NOT NULL,
    pk_id integer,
    pid character varying(20),
    mc_name character varying(100),
    pk_property_id integer,
    colony_name character varying(300),
    owner_name character varying(500),
    address text,
    mobile_no character varying(20),
    property_category character varying(50),
    property_type character varying(100),
    plot_size character varying(50),
    area_type character varying(10),
    is_authorised boolean,
    is_integrated boolean,
    thematic character varying(20),
    img text,
    bill_sr_no integer,
    is_self_certified character varying(10),
    is_objection_approved character varying(50),
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_gis_rohtak_all_20250523 OWNER TO medusa_user;

--
-- Name: sadahaq_gis_rohtak_all_20250523_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_gis_rohtak_all_20250523_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_gis_rohtak_all_20250523_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_gis_rohtak_all_20250523_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_gis_rohtak_all_20250523_id_seq OWNED BY public.sadahaq_gis_rohtak_all_20250523.id;


--
-- Name: sadahaq_gis_rohtak_commercial_20250523; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_gis_rohtak_commercial_20250523 (
    id integer NOT NULL,
    pk_id integer,
    pid character varying(20),
    mc_name character varying(100),
    pk_property_id integer,
    colony_name character varying(300),
    owner_name character varying(500),
    address text,
    mobile_no character varying(20),
    property_category character varying(50),
    property_type character varying(100),
    plot_size character varying(50),
    area_type character varying(10),
    is_authorised boolean,
    is_integrated boolean,
    thematic character varying(20),
    img text,
    bill_sr_no integer,
    is_self_certified character varying(10),
    is_objection_approved character varying(50),
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_gis_rohtak_commercial_20250523 OWNER TO medusa_user;

--
-- Name: sadahaq_gis_rohtak_commercial_20250523_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_gis_rohtak_commercial_20250523_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_gis_rohtak_commercial_20250523_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_gis_rohtak_commercial_20250523_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_gis_rohtak_commercial_20250523_id_seq OWNED BY public.sadahaq_gis_rohtak_commercial_20250523.id;


--
-- Name: sadahaq_govt_departments; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_govt_departments (
    id integer,
    dept_code character varying(40),
    name_en character varying(180),
    name_hi character varying(180),
    category character varying(80),
    tier character varying(255),
    parent_dept_id integer,
    head_designation character varying(120),
    head_officer character varying(120),
    office_address character varying(255),
    phone character varying(15),
    email character varying(120),
    website_url character varying(255),
    grievance_portal_url character varying(255),
    portal_type character varying(255),
    avg_resolution_days smallint,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.sadahaq_govt_departments OWNER TO medusa_user;

--
-- Name: sadahaq_grievance_logs; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_grievance_logs (
    id integer,
    grievance_id integer,
    actor_id integer,
    actor_role character varying(255),
    action character varying(80),
    old_status character varying(40),
    new_status character varying(40),
    note text,
    meta_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_grievance_logs OWNER TO medusa_user;

--
-- Name: sadahaq_grievances; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_grievances (
    id integer,
    ticket_no character varying(20),
    citizen_id integer,
    assigned_volunteer_id integer,
    dept_id integer,
    mentor_id integer,
    category character varying(80),
    sub_category character varying(80),
    description text,
    description_hi text,
    attachments_json jsonb,
    status character varying(255),
    priority character varying(255),
    channel character varying(255),
    govt_portal_used character varying(60),
    govt_ref_no character varying(100),
    govt_response text,
    escalation_level smallint,
    citizen_rating smallint,
    citizen_feedback text,
    due_date date,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.sadahaq_grievances OWNER TO medusa_user;

--
-- Name: sadahaq_haryana_property_master; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_haryana_property_master (
    id integer,
    ulb text,
    colony text,
    pid character varying(255),
    address text,
    property_type text,
    plot_area_sq_yard text,
    plot_area_sq_meter text,
    owner_name text,
    is_self_certified text,
    self_cert_mobile_masked text,
    details_url text,
    image_url text,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_haryana_property_master OWNER TO medusa_user;

--
-- Name: sadahaq_haryana_property_rohtak; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_haryana_property_rohtak (
    id integer,
    ulb text,
    colony text,
    pid character varying(255),
    address text,
    property_type text,
    plot_area_sq_yard text,
    plot_area_sq_meter text,
    owner_name text,
    is_self_certified text,
    self_cert_mobile_masked text,
    details_url text,
    image_url text,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_haryana_property_rohtak OWNER TO medusa_user;

--
-- Name: sadahaq_haryana_property_rohtak_mcr_2019; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_haryana_property_rohtak_mcr_2019 (
    old_pid character varying(255),
    ward character varying(50),
    owner_name text,
    colony_name text,
    municipality character varying(100)
);


ALTER TABLE public.sadahaq_haryana_property_rohtak_mcr_2019 OWNER TO medusa_user;

--
-- Name: sadahaq_hospitals; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_hospitals (
    id integer,
    document_id integer,
    serial_no character varying(10),
    hospital_name character varying(255),
    hospital_type character varying(255),
    owner_name character varying(150),
    address character varying(255),
    mobile character varying(15),
    phone_office character varying(15),
    beds character varying(20),
    speciality character varying(150),
    source_doc character varying(255),
    created_at timestamp without time zone,
    source_doc_id integer
);


ALTER TABLE public.sadahaq_hospitals OWNER TO medusa_user;

--
-- Name: sadahaq_manufacturers; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_manufacturers (
    id integer,
    document_id integer,
    serial_no character varying(10),
    company_name character varying(255),
    product_type character varying(100),
    owner_name character varying(150),
    address character varying(255),
    mobile character varying(15),
    capacity character varying(100),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_manufacturers OWNER TO medusa_user;

--
-- Name: sadahaq_medical_shops; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_medical_shops (
    id integer,
    document_id integer,
    serial_no character varying(10),
    shop_name character varying(255),
    owner_name character varying(150),
    address character varying(255),
    mobile character varying(15),
    license_no character varying(80),
    source_doc character varying(255),
    created_at timestamp without time zone,
    source_doc_id integer
);


ALTER TABLE public.sadahaq_medical_shops OWNER TO medusa_user;

--
-- Name: sadahaq_mentor_profiles; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_mentor_profiles (
    id integer,
    person_id integer,
    expertise character varying(255),
    profession character varying(100),
    organisation character varying(150),
    linkedin_url character varying(255),
    how_can_help text,
    max_cases_per_month smallint,
    available_for_mentoring boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_mentor_profiles OWNER TO medusa_user;

--
-- Name: sadahaq_ngos; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ngos (
    id integer,
    document_id integer,
    serial_no character varying(10),
    org_name character varying(255),
    president_name character varying(150),
    secretary_name character varying(150),
    address character varying(255),
    mobile character varying(15),
    category character varying(80),
    source_doc character varying(255),
    created_at timestamp without time zone,
    source_doc_id integer
);


ALTER TABLE public.sadahaq_ngos OWNER TO medusa_user;

--
-- Name: sadahaq_notifications; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_notifications (
    id integer,
    person_id integer,
    grievance_id integer,
    channel character varying(255),
    template_key character varying(80),
    message text,
    status character varying(255),
    sent_at timestamp without time zone,
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_notifications OWNER TO medusa_user;

--
-- Name: sadahaq_nss_units; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_nss_units (
    id integer,
    document_id integer,
    serial_no character varying(10),
    institution character varying(255),
    programme_officer character varying(150),
    officer_phone character varying(15),
    unit_strength character varying(20),
    address character varying(255),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_nss_units OWNER TO medusa_user;

--
-- Name: sadahaq_osm_places_rohtak; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_osm_places_rohtak (
    id integer NOT NULL,
    osm_id character varying(50),
    osm_type character varying(20),
    osm_element_id bigint,
    name character varying(500),
    name_hi character varying(500),
    category character varying(100),
    latitude numeric(10,7),
    longitude numeric(10,7),
    address text,
    phone character varying(100),
    website text,
    email character varying(200),
    opening_hours character varying(500),
    cuisine character varying(200),
    brand character varying(200),
    operator character varying(200),
    wheelchair character varying(20),
    internet_access character varying(50),
    all_tags jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_osm_places_rohtak OWNER TO medusa_user;

--
-- Name: sadahaq_osm_places_rohtak_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_osm_places_rohtak_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_osm_places_rohtak_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_osm_places_rohtak_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_osm_places_rohtak_id_seq OWNED BY public.sadahaq_osm_places_rohtak.id;


--
-- Name: sadahaq_people; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_people (
    id integer,
    role character varying(255),
    full_name character varying(120),
    name_hi character varying(120),
    phone character varying(15),
    alt_phone character varying(15),
    email character varying(120),
    aadhaar_last4 character(4),
    ward character varying(60),
    locality character varying(100),
    block_name character varying(60),
    photo_url character varying(255),
    bio text,
    is_active boolean,
    is_verified boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.sadahaq_people OWNER TO medusa_user;

--
-- Name: sadahaq_polygon_boundary_coordinates_ulb_rohtak; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_polygon_boundary_coordinates_ulb_rohtak (
    id integer,
    coordinate_order integer,
    easting_x numeric(20,10),
    northing_y numeric(20,10)
);


ALTER TABLE public.sadahaq_polygon_boundary_coordinates_ulb_rohtak OWNER TO medusa_user;

--
-- Name: sadahaq_postmen; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_postmen (
    id integer,
    document_id integer,
    serial_no character varying(10),
    full_name character varying(150),
    designation character varying(100),
    beat_area character varying(200),
    post_office character varying(150),
    mobile character varying(15),
    source_doc character varying(255),
    created_at timestamp without time zone,
    source_doc_id integer
);


ALTER TABLE public.sadahaq_postmen OWNER TO medusa_user;

--
-- Name: sadahaq_properties_mcr_sector14_map; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_properties_mcr_sector14_map (
    pkpropertyid integer,
    fkdistrictid integer,
    fkulbid integer,
    ulbcode character varying(255),
    mcname character varying(255),
    khasarano character varying(255),
    authorityarea character varying(255),
    colonyname character varying(255),
    fkcolonysurveyid integer,
    propertycategory character varying(255),
    propertytype character varying(255),
    propertysubtype character varying(255),
    ownername character varying(255),
    ownernamendc character varying(255),
    address1 text,
    mobileno character varying(50),
    pid character varying(100),
    pidndc character varying(100),
    unit character varying(50),
    plotsize numeric(20,4),
    lat numeric(18,15),
    long numeric(18,15),
    imageviewlink text,
    linkedpkpropertyid integer,
    integratedcount integer,
    locationsdatajson jsonb,
    pageno integer,
    totalrecord integer,
    isauthorised character varying(10),
    isdataverified2023 character varying(10),
    possessionfile text,
    duedetails_pkdueid integer,
    duedetails_ptaxarrear numeric(20,2),
    duedetails_ptaxdemand numeric(20,2),
    duedetails_ptaxsurcharge numeric(20,2),
    duedetails_ptaxrebate numeric(20,2),
    duedetails_ptaxinterestarrear numeric(20,2),
    duedetails_ptaxrebatearrear numeric(20,2),
    duedetails_ptaxrebateonline numeric(20,2),
    duedetails_ptaxrebateautodebit numeric(20,2),
    duedetails_ptaxrebateinterestarrear numeric(20,2),
    duedetails_ptaxrebategoodtaxpayer numeric(20,2),
    duedetails_ptaxnetdues numeric(20,2),
    duedetails_ptaxarrearpaid numeric(20,2),
    duedetails_ptaxdemandpaid numeric(20,2),
    duedetails_ptaxsurchargepaid numeric(20,2),
    duedetails_ptaxrebatepaid numeric(20,2),
    duedetails_ptaxinterestarrearpaid numeric(20,2),
    duedetails_ptaxrebatearrearpaid numeric(20,2),
    duedetails_ptaxrebateonlinepaid numeric(20,2),
    duedetails_ptaxamountpaid numeric(20,2),
    duedetails_ptaxrebatedate date,
    duedetails_firetaxarrear numeric(20,2),
    duedetails_firetaxdemand numeric(20,2),
    duedetails_firetaxsurcharge numeric(20,2),
    duedetails_firetaxrebate numeric(20,2),
    duedetails_firetaxnetdues numeric(20,2),
    duedetails_firetaxarrearpaid numeric(20,2),
    duedetails_firetaxdemandpaid numeric(20,2),
    duedetails_firetaxsurchargepaid numeric(20,2),
    duedetails_firetaxrebatepaid numeric(20,2),
    duedetails_firetaxamountpaid numeric(20,2),
    duedetails_firetaxrebatedate date,
    duedetails_totalptaxftaxaccess numeric(20,2),
    duedetails_developmentarrear numeric(20,2),
    duedetails_developmentdemand numeric(20,2),
    duedetails_developmentsurcharge numeric(20,2),
    duedetails_developmentrebate numeric(20,2),
    duedetails_developmentinterest numeric(20,2),
    duedetails_developmentnetdues numeric(20,2),
    duedetails_developmentarrearpaid numeric(20,2),
    duedetails_developmentdemandpaid numeric(20,2),
    duedetails_developmentsurchargepaid numeric(20,2),
    duedetails_developmentrebatepaid numeric(20,2),
    duedetails_developmentinterestpaid numeric(20,2),
    duedetails_developmentamountpaid numeric(20,2),
    duedetails_developmentrebatedate date,
    duedetails_usagearrear numeric(20,2),
    duedetails_usagedemand numeric(20,2),
    duedetails_usagesurcharge numeric(20,2),
    duedetails_usagerebate numeric(20,2),
    duedetails_usagenetdues numeric(20,2),
    duedetails_usagearrearpaid numeric(20,2),
    duedetails_usagedemandpaid numeric(20,2),
    duedetails_usagesurchargepaid numeric(20,2),
    duedetails_usagerebatepaid numeric(20,2),
    duedetails_usageamountpaid numeric(20,2),
    duedetails_usagerebatedate date,
    duedetails_solidwastearrear numeric(20,2),
    duedetails_solidwastedemand numeric(20,2),
    duedetails_solidwastesurcharge numeric(20,2),
    duedetails_solidwasterebate numeric(20,2),
    duedetails_solidwasterebateonline numeric(20,2),
    duedetails_solidwastenetdues numeric(20,2),
    duedetails_solidwastearrearpaid numeric(20,2),
    duedetails_solidwastedemandpaid numeric(20,2),
    duedetails_solidwastesurchargepaid numeric(20,2),
    duedetails_solidwasterebatepaid numeric(20,2),
    duedetails_solidwasteamountpaid numeric(20,2),
    duedetails_solidwasterebatedate date,
    duedetails_mcfeeamount numeric(20,2),
    duedetails_mcfeeamountpaid numeric(20,2),
    duedetails_totaldue numeric(20,2),
    duedetails_totalamountpaid numeric(20,2),
    duedetails_miscellaneouscharges numeric(20,2),
    duedetails_totalpenaltydue numeric(20,2),
    duedetails_totalpenaltyduepaid numeric(20,2),
    duedetails_penaltytype character varying(255),
    duedetails_ptaxarrearbuilder numeric(20,2),
    duedetails_ptaxinterestarrearbuilder numeric(20,2),
    duedetails_firetaxarrearbuilder numeric(20,2),
    plotno character varying(255),
    claimcount integer,
    integratedcountcmcdmc integer,
    fkpropertysubtypeid integer,
    token text
);


ALTER TABLE public.sadahaq_properties_mcr_sector14_map OWNER TO medusa_user;

--
-- Name: sadahaq_schools; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_schools (
    id integer,
    document_id integer,
    serial_no character varying(10),
    block_name character varying(80),
    school_name character varying(255),
    school_type character varying(255),
    principal character varying(150),
    contact character varying(15),
    capacity character varying(20),
    facilities character varying(255),
    address character varying(255),
    source_doc character varying(255),
    created_at timestamp without time zone,
    source_doc_id integer,
    parent_school_name character varying(255),
    clean_school_name character varying(255)
);


ALTER TABLE public.sadahaq_schools OWNER TO medusa_user;

--
-- Name: sadahaq_service_access; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_service_access (
    id integer,
    person_id integer,
    service character varying(40),
    role character varying(255),
    is_active boolean,
    enabled_at timestamp without time zone
);


ALTER TABLE public.sadahaq_service_access OWNER TO medusa_user;

--
-- Name: sadahaq_surveillance_teams; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_surveillance_teams (
    id integer,
    document_id integer,
    block_name character varying(80),
    village character varying(150),
    member_name character varying(150),
    designation character varying(150),
    mobile character varying(15),
    incharge_name character varying(150),
    incharge_mobile character varying(15),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_surveillance_teams OWNER TO medusa_user;

--
-- Name: sadahaq_task_applications; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_task_applications (
    id bigint,
    task_id bigint,
    volunteer_id bigint,
    status character varying(30),
    remarks text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_task_applications OWNER TO medusa_user;

--
-- Name: sadahaq_theme_settings; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_theme_settings (
    cfg_key character varying(50),
    cfg_value character varying(100)
);


ALTER TABLE public.sadahaq_theme_settings OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_colony_master; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ulb_colony_master (
    sequence_no integer,
    colony_id integer,
    colony_name character varying(255)
);


ALTER TABLE public.sadahaq_ulb_colony_master OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_municipality_master; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ulb_municipality_master (
    ulb_id integer,
    ulb_name character varying(255)
);


ALTER TABLE public.sadahaq_ulb_municipality_master OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_property_type_master; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ulb_property_type_master (
    type_id integer,
    type_name character varying(255)
);


ALTER TABLE public.sadahaq_ulb_property_type_master OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_rohtak_properties_20250523; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_ulb_rohtak_properties_20250523 (
    id integer NOT NULL,
    pid character varying(20),
    colony character varying(300),
    address text,
    property_type character varying(50),
    plot_area_sqyard character varying(50),
    plot_area_sqmeter character varying(50),
    owner_name character varying(500),
    is_self_certified character varying(10),
    mobile_masked character varying(20),
    detail_url text,
    image_url text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    extra_details jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sadahaq_ulb_rohtak_properties_20250523 OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_rohtak_properties_20250523_id_seq; Type: SEQUENCE; Schema: public; Owner: medusa_user
--

CREATE SEQUENCE public.sadahaq_ulb_rohtak_properties_20250523_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sadahaq_ulb_rohtak_properties_20250523_id_seq OWNER TO medusa_user;

--
-- Name: sadahaq_ulb_rohtak_properties_20250523_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medusa_user
--

ALTER SEQUENCE public.sadahaq_ulb_rohtak_properties_20250523_id_seq OWNED BY public.sadahaq_ulb_rohtak_properties_20250523.id;


--
-- Name: sadahaq_view_rohtak_eagle_view; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_view_rohtak_eagle_view (
    dept_id integer,
    dept_code character varying(40),
    dept_name character varying(180),
    category character varying(80),
    pid character varying(255),
    colony text,
    latitude numeric(20,10),
    longitude numeric(20,10)
);


ALTER TABLE public.sadahaq_view_rohtak_eagle_view OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_hours; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_hours (
    id bigint,
    volunteer_id bigint,
    task_id bigint,
    hours numeric(8,2),
    work_date date,
    remarks text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_hours OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_interests; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_interests (
    id bigint,
    volunteer_id bigint,
    section_id bigint,
    subsection_id bigint,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_interests OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_profiles; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_profiles (
    id integer,
    person_id integer,
    volunteer_type character varying(255),
    dept_expertise character varying(255),
    languages character varying(100),
    cases_handled integer,
    cases_resolved integer,
    rating numeric(3,2),
    on_duty boolean,
    joined_at date,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_profiles OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_sections; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_sections (
    id bigint,
    section_name character varying(150),
    slug character varying(180),
    icon character varying(100),
    sort_order integer,
    status boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_sections OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_subsections; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_subsections (
    id bigint,
    section_id bigint,
    subsection_name character varying(200),
    slug character varying(220),
    description text,
    sort_order integer,
    status boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_subsections OWNER TO medusa_user;

--
-- Name: sadahaq_volunteer_tasks; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteer_tasks (
    id bigint,
    title character varying(255),
    description text,
    section_id bigint,
    subsection_id bigint,
    district character varying(100),
    start_date date,
    end_date date,
    status character varying(30),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteer_tasks OWNER TO medusa_user;

--
-- Name: sadahaq_volunteers; Type: TABLE; Schema: public; Owner: medusa_user
--

CREATE TABLE public.sadahaq_volunteers (
    id bigint,
    document_id integer,
    serial_no character varying(10),
    enrollment_no character varying(50),
    full_name character varying(150),
    mobile character varying(15),
    father_name character varying(150),
    dob character varying(20),
    institution character varying(255),
    year_of_study character varying(20),
    source_doc character varying(255),
    created_at timestamp without time zone
);


ALTER TABLE public.sadahaq_volunteers OWNER TO medusa_user;

--
-- Name: dr_banners id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.dr_banners ALTER COLUMN id SET DEFAULT nextval('public.dr_banners_id_seq'::regclass);


--
-- Name: dr_pages id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.dr_pages ALTER COLUMN id SET DEFAULT nextval('public.dr_pages_id_seq'::regclass);


--
-- Name: sadahaq_gis_haryana_all_20250524 id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_haryana_all_20250524 ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_gis_haryana_all_20250524_id_seq'::regclass);


--
-- Name: sadahaq_gis_properties_haryana_20250523 id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_properties_haryana_20250523 ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_gis_properties_haryana_20250523_id_seq'::regclass);


--
-- Name: sadahaq_gis_rohtak_all_20250523 id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_rohtak_all_20250523 ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_gis_rohtak_all_20250523_id_seq'::regclass);


--
-- Name: sadahaq_gis_rohtak_commercial_20250523 id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_gis_rohtak_commercial_20250523 ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_gis_rohtak_commercial_20250523_id_seq'::regclass);


--
-- Name: sadahaq_osm_places_rohtak id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_osm_places_rohtak ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_osm_places_rohtak_id_seq'::regclass);


--
-- Name: sadahaq_ulb_rohtak_properties_20250523 id; Type: DEFAULT; Schema: public; Owner: medusa_user
--

ALTER TABLE ONLY public.sadahaq_ulb_rohtak_properties_20250523 ALTER COLUMN id SET DEFAULT nextval('public.sadahaq_ulb_rohtak_properties_20250523_id_seq'::regclass);


--
-- Data for Name: dr_banners; Type: TABLE DATA; Schema: public; Owner: medusa_user
--

