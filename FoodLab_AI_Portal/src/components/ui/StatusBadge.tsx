import type {ModuleStatus} from '../../types/module';
const classes:Record<ModuleStatus,string>={COMPLETE:'status status-complete',STABLE:'status status-stable','IN DEVELOPMENT':'status status-progress','NEEDS REVIEW':'status status-review',ERROR:'status status-error'};
export function StatusBadge({status}:{status:ModuleStatus}){return <span className={classes[status]}>{status}</span>}
