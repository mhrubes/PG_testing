DROP VIEW IF EXISTS cbos.v_items;

CREATE VIEW cbos.v_items AS
    SELECT i.id,
           i.name,
           cg.cgroup_id,
           cg.name AS central_group_name,
           vg.vat_id,
           vg.name AS vat_name,
           ccg.ccs_id,
           ccg.name AS ccs_name,
           i.price,
           i.created,
           i.updated
    FROM cbos.items i
    JOIN cbos.central_groups cg ON cg.cgroup_id = i.cgroup_id
    JOIN cbos.vat_groups vg ON vg.vat_id = i.vat_id
    JOIN cbos.ccs_groups ccg ON ccg.ccs_id = i.ccs_id;
