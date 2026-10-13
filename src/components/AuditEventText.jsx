const strong = (text) => <span className="font-semibold">{text}</span>;

const roleName = (role) => (role === "super_admin" ? "super admin" : "school admin");

// one-line sentence (used on the Platform dashboard)
export default function AuditEventText({ event }) {
    const actor = strong(event.actor_name);
    const target = strong(event.target_label ?? "something");
    const d = event.details ?? {};

    switch (event.action) {
        case "user.registered":
            return <>{target} registered as a {d.role}</>;
        case "user.approved":
            return <>{actor} approved {d.role} {target}</>;
        case "user.rejected":
            return <>{actor} rejected {d.role} {target}</>;
        case "user.reset":
            return <>{actor} moved {target} back to pending</>;
        case "exam.created":
            return <>{actor} created exam {target}</>;
        case "exam.submitted":
            return <>{actor} sent exam {target} for approval</>;
        case "exam.withdrawn":
            return <>{actor} withdrew exam {target}</>;
        case "exam.approved":
            return <>{actor} approved exam {target}</>;
        case "exam.rejected":
            return <>{actor} rejected exam {target}</>;
        case "exam.updated":
            return <>{actor} edited exam {target}</>;
        case "exam.deleted":
            return <>{actor} deleted exam {target}</>;
        case "results.released":
            return <>{actor} released results for {target}</>;
        case "results.visibility":
            return <>{actor} changed when students see scores for {target}</>;
        case "admin.added":
            return <>{actor} added role to ({roleName(d.role)}) {target}</>;
        case "admin.removed":
            return <>{actor} removed the {roleName(d.role)} role from {target}</>;
        case "user.disabled":
            return <>{actor} disabled {d.role} {target}</>;
        case "user.enabled":
            return <>{actor} enabled {d.role} {target}</>;
        case "user.role_changed":
            return <>{actor} changed {target} from {d.from} to {d.to}</>;
        default:
            return <>{actor} {event.action} {target}</>;
    }
}

// the ACTION column
export function auditAction(event) {
    const d = event.details ?? {};

    switch (event.action) {
        case "user.registered": return `registered as a ${d.role}`;
        case "user.approved": return `approved ${d.role}`;
        case "user.rejected": return `rejected ${d.role}`;
        case "user.reset": return "moved back to pending";
        case "exam.created": return "created exam";
        case "exam.submitted": return "sent exam for approval";
        case "exam.withdrawn": return "withdrew exam";
        case "exam.approved": return "approved exam";
        case "exam.rejected": return "rejected exam";
        case "exam.updated": return "edited exam";
        case "exam.deleted": return "deleted exam";
        case "results.released": return "released results for";
        case "results.visibility": return "changed score visibility for";
        case "admin.added": return `added role to (${roleName(d.role)})`;
        case "admin.removed": return `removed role (${roleName(d.role)}) from`;
        case "user.disabled": return `disabled ${d.role}`;
        case "user.enabled": return `enabled ${d.role}`;
        case "user.role_changed": return `changed role (${d.from} → ${d.to})`;
        default: return event.action;
    }
}

// the ON column (a person registering has no separate target)
export function auditOn(event) {
    if (event.action === "user.registered") return null;
    return event.target_label ?? null;
}

// the NOTE column
export function auditDetail(event) {
    const d = event.details ?? {};

    if (event.action === "exam.rejected" && d.note) return d.note;

    if (event.action === "exam.updated") {
        const parts = [];
        if (d.title) parts.push(`Title: ${d.title[0]} → ${d.title[1]}`);
        if (d.duration) parts.push(`Duration: ${d.duration[0]} → ${d.duration[1]} min`);
        return parts.join(" · ") || null;
    }

    if (event.action === "results.visibility") {
        return d.mode === "immediate"
            ? "Students see their score as soon as they submit"
            : "Students wait until results are released";
    }

    return null;
}