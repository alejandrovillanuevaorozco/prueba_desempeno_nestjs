--
-- PostgreSQL database dump
--

-- Dumped from database version 15.3
-- Dumped by pg_dump version 15.3

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

ALTER TABLE IF EXISTS ONLY public.maintenances DROP CONSTRAINT IF EXISTS "FK_f92519be34af2de954da0bd4a47";
ALTER TABLE IF EXISTS ONLY public.maintenances DROP CONSTRAINT IF EXISTS "FK_d501088741618ca66074d85e411";
ALTER TABLE IF EXISTS ONLY public.maintenances DROP CONSTRAINT IF EXISTS "FK_a47e3420d123ccf06ab72e1969c";
ALTER TABLE IF EXISTS ONLY public.mechanics DROP CONSTRAINT IF EXISTS "FK_4e69c5d1d5ef843a571535ccfde";
DROP INDEX IF EXISTS public."IDX_ec7181ebdab798d97070122a5b";
DROP INDEX IF EXISTS public."IDX_d37e8342ffec438d0fbaf6b65a";
DROP INDEX IF EXISTS public."IDX_97672ac88f789774dd47f7c8be";
DROP INDEX IF EXISTS public."IDX_4c29d9ab34835c37d1724cf860";
DROP INDEX IF EXISTS public."IDX_3c1b42caf9098095ac185eaaad";
DROP INDEX IF EXISTS public."IDX_301c3b5fa2d49aab65dcfda36a";
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS "UQ_ec7181ebdab798d97070122a5bf";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3";
ALTER TABLE IF EXISTS ONLY public.mechanics DROP CONSTRAINT IF EXISTS "UQ_301c3b5fa2d49aab65dcfda36a6";
ALTER TABLE IF EXISTS ONLY public.mechanics DROP CONSTRAINT IF EXISTS "REL_4e69c5d1d5ef843a571535ccfd";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "PK_a3ffb1c0c8416b9fc6f907b7433";
ALTER TABLE IF EXISTS ONLY public.workshops DROP CONSTRAINT IF EXISTS "PK_6d0e82a124f5b53df91c8989848";
ALTER TABLE IF EXISTS ONLY public.maintenances DROP CONSTRAINT IF EXISTS "PK_62403473bd524a42d58589aa78b";
ALTER TABLE IF EXISTS ONLY public.mechanics DROP CONSTRAINT IF EXISTS "PK_2c0ed23afc0cc7ff361c17e53df";
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS "PK_18d8646b59304dce4af3a9e35b6";
DROP TABLE IF EXISTS public.workshops;
DROP TABLE IF EXISTS public.vehicles;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.mechanics;
DROP TABLE IF EXISTS public.maintenances;
DROP TYPE IF EXISTS public.workshops_status_enum;
DROP TYPE IF EXISTS public.vehicles_status_enum;
DROP TYPE IF EXISTS public.users_role_enum;
DROP TYPE IF EXISTS public.mechanics_status_enum;
DROP TYPE IF EXISTS public.maintenances_type_enum;
DROP TYPE IF EXISTS public.maintenances_status_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: maintenances_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.maintenances_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.maintenances_status_enum OWNER TO postgres;

--
-- Name: maintenances_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.maintenances_type_enum AS ENUM (
    'PREVENTIVE',
    'CORRECTIVE'
);


ALTER TYPE public.maintenances_type_enum OWNER TO postgres;

--
-- Name: mechanics_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mechanics_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public.mechanics_status_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'ADMIN',
    'TECHNICIAN'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

--
-- Name: vehicles_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vehicles_status_enum AS ENUM (
    'AVAILABLE',
    'IN_MAINTENANCE',
    'INACTIVE'
);


ALTER TYPE public.vehicles_status_enum OWNER TO postgres;

--
-- Name: workshops_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.workshops_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public.workshops_status_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: maintenances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.maintenances_type_enum NOT NULL,
    status public.maintenances_status_enum DEFAULT 'SCHEDULED'::public.maintenances_status_enum NOT NULL,
    description text NOT NULL,
    mileage numeric(10,2) NOT NULL,
    "scheduledDate" timestamp with time zone NOT NULL,
    "workDone" text,
    "finalCost" numeric(12,2),
    "completedAt" timestamp with time zone,
    "finalMileage" numeric(10,2),
    vehicle_id uuid NOT NULL,
    mechanic_id uuid NOT NULL,
    workshop_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "estimatedDurationHours" numeric(4,2) DEFAULT '2'::numeric NOT NULL
);


ALTER TABLE public.maintenances OWNER TO postgres;

--
-- Name: mechanics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mechanics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    specialty character varying NOT NULL,
    status public.mechanics_status_enum DEFAULT 'ACTIVE'::public.mechanics_status_enum NOT NULL,
    user_id uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mechanics OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'TECHNICIAN'::public.users_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    plate character varying NOT NULL,
    brand character varying NOT NULL,
    model character varying NOT NULL,
    year integer NOT NULL,
    mileage numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status public.vehicles_status_enum DEFAULT 'AVAILABLE'::public.vehicles_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: workshops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    address character varying NOT NULL,
    status public.workshops_status_enum DEFAULT 'ACTIVE'::public.workshops_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workshops OWNER TO postgres;

--
-- Data for Name: maintenances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenances (id, type, status, description, mileage, "scheduledDate", "workDone", "finalCost", "completedAt", "finalMileage", vehicle_id, mechanic_id, workshop_id, "createdAt", "updatedAt", "estimatedDurationHours") FROM stdin;
4c6176bd-d3b8-4d08-a2af-c9403a713c3b	PREVENTIVE	COMPLETED	Cambio de aceite y filtros de 40.000 km	40000.00	2026-09-15 08:00:00+00	Cambio completo de aceite sintético 15W-40, filtro de aceite y filtro de combustible. Revisión de frenos.	350000.00	2026-09-15 16:30:00+00	40050.00	8559aab6-7e5b-4ad2-bcac-8b2afefd69bf	31eb2ca2-51bd-4213-b478-d449013b4da4	119dd8cc-48bd-444c-a2b0-e2a31c3d7971	2026-10-27 12:49:10.734122	2026-10-27 12:49:10.734122	2.00
3881df82-81f7-4d4e-b1eb-162ecdee0533	CORRECTIVE	IN_PROGRESS	Reparación del sistema de inyección y calibración electrónica	83000.00	2026-10-25 08:00:00+00	\N	\N	\N	\N	6f4e731b-1fad-4962-99a1-f5a313f2863b	0b60719d-fc61-4761-bd6b-0e03977ba82f	119dd8cc-48bd-444c-a2b0-e2a31c3d7971	2026-10-27 12:49:10.73718	2026-10-27 12:49:10.73718	2.00
\.


--
-- Data for Name: mechanics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mechanics (id, name, email, specialty, status, user_id, "createdAt", "updatedAt") FROM stdin;
31eb2ca2-51bd-4213-b478-d449013b4da4	Carlos Pérez	carlos.perez@fleetcore.com	Diesel Engines & Transmission	ACTIVE	ea27f503-400c-4596-802f-a369d4f459ce	2026-10-27 12:49:10.710982	2026-10-27 12:49:10.710982
0b60719d-fc61-4761-bd6b-0e03977ba82f	Laura Gómez	laura.gomez@fleetcore.com	Brakes & Electrical Systems	ACTIVE	ae456a0f-646a-4489-9c39-85feed3f0fb6	2026-10-27 12:49:10.71399	2026-10-27 12:49:10.71399
90d3c9e9-347f-484a-a2ac-21896014fe21	Mario Restrepo	mario.restrepo@fleetcore.com	Suspension & Steering	INACTIVE	\N	2026-10-27 12:49:10.716309	2026-10-27 12:49:10.716309
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cb024f8b-6715-4324-9c57-705af79baec4	admin@fleetcore.com	$2b$10$Prob63s7xTa2uDP4/VXOAOMUjXSMH08etznx3xftRshy8oR4gmt4C	ADMIN	t	2026-10-27 12:49:10.699708	2026-10-27 15:29:38.42936
ea27f503-400c-4596-802f-a369d4f459ce	technician1@fleetcore.com	$2b$10$Prob63s7xTa2uDP4/VXOAOMUjXSMH08etznx3xftRshy8oR4gmt4C	TECHNICIAN	t	2026-10-27 12:49:10.705654	2026-10-27 15:29:38.435432
ae456a0f-646a-4489-9c39-85feed3f0fb6	technician2@fleetcore.com	$2b$10$Prob63s7xTa2uDP4/VXOAOMUjXSMH08etznx3xftRshy8oR4gmt4C	TECHNICIAN	t	2026-10-27 12:49:10.707898	2026-10-27 15:29:38.438933
da0c705b-c5a2-45a5-9643-cda282715c1e	pffalejo@fleetcore.com	$2b$10$.ZAaEPcn4hnLz/G.mMkPkefgQ7xb07qy8/o1qE/0Qi5I.GczLtE4O	ADMIN	t	2026-10-27 15:59:04.272456	2026-10-27 15:59:04.272456
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicles (id, plate, brand, model, year, mileage, status, "createdAt", "updatedAt") FROM stdin;
8559aab6-7e5b-4ad2-bcac-8b2afefd69bf	ABC123	Chevrolet	NPR	2022	45000.00	AVAILABLE	2026-10-27 12:49:10.72373	2026-10-27 15:29:38.449171
9aca8096-8a22-44db-a4a8-ae3f09af5618	XYZ789	Hino	Dutro	2021	62000.00	AVAILABLE	2026-10-27 12:49:10.726148	2026-10-27 15:29:38.451968
6f4e731b-1fad-4962-99a1-f5a313f2863b	DEF456	Kenworth	T680	2023	83000.00	IN_MAINTENANCE	2026-10-27 12:49:10.728353	2026-10-27 15:29:38.455951
c62d7e58-cf21-4821-aa85-5054168814f3	OLD001	Ford	Cargo	2010	310000.00	INACTIVE	2026-10-27 12:49:10.730508	2026-10-27 15:29:38.458583
3b76acd0-dd98-4201-afbd-a1e9e7974cdf	XXX123	Chevrolet	NPOR	2022	45000.00	AVAILABLE	2026-10-27 16:03:27.713499	2026-10-27 16:03:27.713499
\.


--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workshops (id, name, address, status, "createdAt", "updatedAt") FROM stdin;
119dd8cc-48bd-444c-a2b0-e2a31c3d7971	Taller Central FleetCore	Av. Industrial #45-12, Bogotá	ACTIVE	2026-10-27 12:49:10.718669	2026-10-27 12:49:10.718669
231abafb-4a22-4d6e-8d29-0a725db2a6bb	Taller Auxiliar Sur	Calle 68 Sur #10-40, Soacha	INACTIVE	2026-10-27 12:49:10.721178	2026-10-27 12:49:10.721178
\.


--
-- Name: vehicles PK_18d8646b59304dce4af3a9e35b6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY (id);


--
-- Name: mechanics PK_2c0ed23afc0cc7ff361c17e53df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "PK_2c0ed23afc0cc7ff361c17e53df" PRIMARY KEY (id);


--
-- Name: maintenances PK_62403473bd524a42d58589aa78b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "PK_62403473bd524a42d58589aa78b" PRIMARY KEY (id);


--
-- Name: workshops PK_6d0e82a124f5b53df91c8989848; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT "PK_6d0e82a124f5b53df91c8989848" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: mechanics REL_4e69c5d1d5ef843a571535ccfd; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "REL_4e69c5d1d5ef843a571535ccfd" UNIQUE (user_id);


--
-- Name: mechanics UQ_301c3b5fa2d49aab65dcfda36a6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "UQ_301c3b5fa2d49aab65dcfda36a6" UNIQUE (email);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: vehicles UQ_ec7181ebdab798d97070122a5bf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "UQ_ec7181ebdab798d97070122a5bf" UNIQUE (plate);


--
-- Name: IDX_301c3b5fa2d49aab65dcfda36a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_301c3b5fa2d49aab65dcfda36a" ON public.mechanics USING btree (email);


--
-- Name: IDX_3c1b42caf9098095ac185eaaad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3c1b42caf9098095ac185eaaad" ON public.maintenances USING btree (mechanic_id, status);


--
-- Name: IDX_4c29d9ab34835c37d1724cf860; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4c29d9ab34835c37d1724cf860" ON public.maintenances USING btree (vehicle_id, status);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_d37e8342ffec438d0fbaf6b65a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d37e8342ffec438d0fbaf6b65a" ON public.maintenances USING btree ("scheduledDate");


--
-- Name: IDX_ec7181ebdab798d97070122a5b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_ec7181ebdab798d97070122a5b" ON public.vehicles USING btree (plate);


--
-- Name: mechanics FK_4e69c5d1d5ef843a571535ccfde; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mechanics
    ADD CONSTRAINT "FK_4e69c5d1d5ef843a571535ccfde" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenances FK_a47e3420d123ccf06ab72e1969c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_a47e3420d123ccf06ab72e1969c" FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE RESTRICT;


--
-- Name: maintenances FK_d501088741618ca66074d85e411; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_d501088741618ca66074d85e411" FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: maintenances FK_f92519be34af2de954da0bd4a47; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_f92519be34af2de954da0bd4a47" FOREIGN KEY (mechanic_id) REFERENCES public.mechanics(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

