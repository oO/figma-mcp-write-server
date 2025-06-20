-- Font Database Schema
-- Stores font metadata from Figma API for efficient search and filtering

-- Main fonts table storing font family and metadata
CREATE TABLE IF NOT EXISTS fonts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('system', 'google', 'custom')),
    style_count INTEGER NOT NULL DEFAULT 0,
    is_loaded BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family)
);

-- Font styles table for individual font variants
CREATE TABLE IF NOT EXISTS font_styles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    font_id INTEGER NOT NULL,
    style TEXT NOT NULL,
    weight INTEGER,
    width TEXT,
    slant TEXT,
    full_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (font_id) REFERENCES fonts(id) ON DELETE CASCADE,
    UNIQUE(font_id, style)
);

-- Sync metadata table for tracking synchronization status
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row
    last_sync_time DATETIME,
    total_fonts_synced INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'never' CHECK (sync_status IN ('never', 'in_progress', 'completed', 'failed')),
    sync_error TEXT,
    schema_version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fonts_family ON fonts(family);
CREATE INDEX IF NOT EXISTS idx_fonts_source ON fonts(source);
CREATE INDEX IF NOT EXISTS idx_fonts_style_count ON fonts(style_count);
CREATE INDEX IF NOT EXISTS idx_fonts_family_source ON fonts(family, source);

CREATE INDEX IF NOT EXISTS idx_font_styles_font_id ON font_styles(font_id);
CREATE INDEX IF NOT EXISTS idx_font_styles_style ON font_styles(style);
CREATE INDEX IF NOT EXISTS idx_font_styles_weight ON font_styles(weight);

-- Full-text search index for font family names
CREATE VIRTUAL TABLE IF NOT EXISTS fonts_fts USING fts5(
    family,
    content='fonts',
    content_rowid='id'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS fonts_fts_insert AFTER INSERT ON fonts BEGIN
    INSERT INTO fonts_fts(rowid, family) VALUES (new.id, new.family);
END;

CREATE TRIGGER IF NOT EXISTS fonts_fts_delete AFTER DELETE ON fonts BEGIN
    INSERT INTO fonts_fts(fonts_fts, rowid, family) VALUES('delete', old.id, old.family);
END;

CREATE TRIGGER IF NOT EXISTS fonts_fts_update AFTER UPDATE ON fonts BEGIN
    INSERT INTO fonts_fts(fonts_fts, rowid, family) VALUES('delete', old.id, old.family);
    INSERT INTO fonts_fts(rowid, family) VALUES (new.id, new.family);
END;

-- Trigger to update style_count when font_styles change
CREATE TRIGGER IF NOT EXISTS update_style_count_insert AFTER INSERT ON font_styles BEGIN
    UPDATE fonts 
    SET style_count = (
        SELECT COUNT(*) FROM font_styles WHERE font_id = NEW.font_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.font_id;
END;

CREATE TRIGGER IF NOT EXISTS update_style_count_delete AFTER DELETE ON font_styles BEGIN
    UPDATE fonts 
    SET style_count = (
        SELECT COUNT(*) FROM font_styles WHERE font_id = OLD.font_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.font_id;
END;

-- Initialize sync metadata
INSERT OR IGNORE INTO sync_metadata (id, sync_status) VALUES (1, 'never');