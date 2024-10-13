CREATE TABLE cbos.items (
    id SERIAL PRIMARY KEY,                      -- Automatické inkrementace a primární klíč
    name VARCHAR(255),                          -- Sloupec pro jméno (max. 255 znaků)
    price INT NOT NULL,                         -- Sloupec pro cenu (číselný)
    vat_id INT NOT NULL,                        -- Sloupec pro DPH ID (číselný)
    ccs_id INT NOT NULL,                        -- Sloupec pro CCS ID (číselný)
    cgroup_id INT NOT NULL,                     -- Sloupec pro cgroup ID (číselný)
    commentary VARCHAR(500),                    -- Sloupec pro komentář (max. 500 znaků)
    created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro vytvoření s výchozí hodnotou
    updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Sloupec pro aktualizaci
);

CREATE INDEX idx_items ON items(id);
CREATE INDEX idx_items_ccs ON items(ccs_id);
CREATE INDEX idx_items_vat ON items(vat_id);
CREATE INDEX idx_items_cgroup ON items(cgroup_id);
CREATE INDEX idx_items_name ON items(name);
