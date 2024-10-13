CREATE TABLE cbos.vat_groups (
    id SERIAL PRIMARY KEY,                      -- Automatické inkrementace a primární klíč
    name VARCHAR(255),                          -- Sloupec pro jméno (max. 255 znaků)
    vat_id INT NOT NULL,                        -- Sloupec pro DPH ID (číselný)
    created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro vytvoření s výchozí hodnotou
    updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro aktualizaci
);

CREATE INDEX idx_vat_groups ON vat_groups(vat_id);
