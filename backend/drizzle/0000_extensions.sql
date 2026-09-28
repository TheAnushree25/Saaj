-- Custom SQL migration file, put your code below! --
-- btree_gist lets one index mix "=" on a uuid with "&&" (overlap) on a time range.
-- The no-double-booking rule in migration 0002 cannot exist without it.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- pg_trgm makes "find artists whose name looks like 'rhea kap'" fast and typo-tolerant.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
