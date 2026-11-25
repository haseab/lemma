CREATE TABLE IF NOT EXISTS download_counts (
 day TEXT NOT NULL,
 version TEXT NOT NULL,
 platform TEXT NOT NULL CHECK(platform IN ('mac','windows')),
 source TEXT NOT NULL CHECK(source IN ('header','releases','direct')),
 event TEXT NOT NULL CHECK(event IN ('click','request')),
 count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day, version, platform, source, event)
) WITHOUT ROWID;
