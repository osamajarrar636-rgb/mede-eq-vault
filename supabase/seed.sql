-- Run after creating an admin account and setting its profile role to ADMIN.
-- The seed is idempotent by manufacturer/model/serial number.
insert into public.equipment (manufacturer,device_name,model,serial_number,category,device_type,year,description,approval_status,created_by)
select 'Tuttnauer','Steam Sterilizer','Valueklave 1730','14050877','Autoclave / Steam Sterilizer','Steam Sterilizer',2014,'Professional engineering record for Tuttnauer Valueklave 1730.','APPROVED',p.id
from (select id from public.profiles where role='ADMIN' order by created_at limit 1) p
where not exists (select 1 from public.equipment where manufacturer='Tuttnauer' and model='Valueklave 1730' and serial_number='14050877');

insert into public.equipment_identifiers(equipment_id,field_name,field_value,unit,created_by)
select e.id, x.field_name, x.field_value, x.unit, e.created_by
from public.equipment e cross join (values
('NB','210156',null),('Machine Pressure','2.8','bar'),('Test Pressure','4.1','bar'),('Capacity','7.5','L'),('Voltage','230','V'),('Current','5.6','A'),('Frequency','50','Hz'),('Protection Class','Class I',null),('IP Rating','IP31',null)
) as x(field_name,field_value,unit)
where e.manufacturer='Tuttnauer' and e.model='Valueklave 1730'
on conflict (equipment_id,field_name) do nothing;

insert into public.repair_cases(equipment_id,problem_title,reported_fault,initial_inspection,diagnosis,root_cause,corrective_action,final_result,repair_date,approval_status,created_by)
select e.id,'Water leakage during sterilization.','Water was leaking from the door safety locking mechanism area during operation.','The safety locking mechanism was removed and inspected.','Leakage was traced to the door safety locking/sealing component.','The Door Bellow/sealing component was damaged.','The complete Door Bellow component was replaced.','The sterilizer was tested after replacement and the leakage problem was resolved.',current_date,'APPROVED',e.created_by
from public.equipment e where e.manufacturer='Tuttnauer' and e.model='Valueklave 1730' and not exists(select 1 from public.repair_cases r where r.equipment_id=e.id and r.problem_title='Water leakage during sterilization.');
