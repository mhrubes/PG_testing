CREATE TABLE cbos.central_groups (
    id SERIAL PRIMARY KEY,                      -- Automatické inkrementace a primární klíč
    name VARCHAR(255),                          -- Sloupec pro jméno (max. 255 znaků)
    cgroup_id INT NOT NULL,                     -- Sloupec pro cgroup ID (číselný)
    created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro vytvoření s výchozí hodnotou
    updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Sloupec pro aktualizaci
);

CREATE INDEX idx_central_groups ON central_groups(cgroup_id);
