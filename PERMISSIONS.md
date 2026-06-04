# THOTH ERP — Permission Model

## Roles

### Owner (مالك)
- Full control of workspace
- Manage billing and plan
- Delete workspace
- Manage all members and roles
- Access all modules and data
- Export and import all data
- Manage integrations and API keys

### Admin (مسؤول)
- Manage workspace settings
- Invite and remove members (except Owner)
- Manage all modules and data
- Export and import data
- Create and manage departments
- View all reports and analytics
- Cannot delete workspace or change Owner

### Manager (مدير)
- Manage team members in their department
- Create and assign work items
- View team workload and performance
- Approve requests and reviews
- Access CRM, Finance, and Operations data
- Export data for their department
- Cannot manage workspace settings or billing

### Employee (موظف)
- View and manage assigned work items
- Create deals, invoices, and contacts
- View CRM and Finance data
- Update own profile
- Cannot manage other members
- Cannot change workspace settings
- Cannot delete records created by others

### Viewer (مشاهد)
- Read-only access to all visible data
- Cannot create, edit, or delete any records
- Cannot export data
- Cannot manage team or settings
- Ideal for external stakeholders or auditors

## Database Implementation

### Tables
- `profiles` — Auth user profiles (id, email, full_name)
- `workspace_members` — User-to-workspace mapping with role
- `people` — Employee directory with HR metadata in JSON

### Row Level Security (RLS)
- All data tables enforce `workspace_id` isolation
- Only workspace members can read workspace data
- Write permissions based on `workspace_members.role`
- Owner bypass for all operations

### Future Enhancements
- Field-level permissions per module
- Custom roles with granular permissions
- Audit log for permission changes
- Two-factor authentication for Admins+
- IP allowlisting for sensitive operations
