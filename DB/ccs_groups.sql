CREATE TABLE cbos.ccs_groups (
    id SERIAL PRIMARY KEY,                      -- Automatické inkrementace a primární klíč
    name VARCHAR(255),                          -- Sloupec pro jméno (max. 255 znaků)
    ccs_id INT NOT NULL,                        -- Sloupec pro CCS ID (číselný)
    created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro vytvoření s výchozí hodnotou
    updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro aktualizaci
);

CREATE INDEX idx_ccs_groups ON ccs_groups(ccs_id);
