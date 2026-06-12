export type Department = 
  | 'HR' 
  | 'HR & IR' 
  | 'Accounts' 
  | 'Accounts Audit' 
  | 'Accounts Compliance'
  | 'Purchase' 
  | 'Purchase & Commercial' 
  | 'PRM' 
  | 'Intern - S/w'
  | 'Admin';

export type Role = 'employee' | 'manager' | 'dept_head';

export type KraCategory = 
  | 'Attendance' | 'Recruitment' | 'Payroll' | 'PF_and_ESI'
  | 'Compliance' | 'Purchase' | 'Strategic_Procurement' | 'Finance__Control' 
  | 'Tally Entry' | 'MIS_and_Cash' | 'Accounts Billings' | 'HR_IR_Leadership' 
  | 'Miscellaneous' | 'Intern - Purchase' | 'Data Entry' | 'Costing & MIS' | 'PR_Ops';

export type TaskStatus = 'Completed' | 'In Progress' | 'Pending' | 'Blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: Role;
  created_at?: string;
}

export interface Entry {
  id: string;
  user_id: string;
  work_date: string;
  department: Department;
  kra_category: KraCategory;
  tasks_text: string;
  hours_spent: number;
  task_status: TaskStatus;
  has_issue: boolean;
  issue_description?: string;
  plan_for_tomorrow?: string;
  submitted_at: string;
  approval_status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  
  // Joined relation for UI display
  pgepl_users?: {
    name: string;
    department: Department;
  };
}

export interface DepartmentConfig {
  id: string;
  name: string;
  created_at: string;
}

export interface KraConfig {
  id: string;
  name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  timestamp: string;
  pgepl_users?: {
    name: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  timestamp: string;
}
